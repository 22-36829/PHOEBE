from flask import Blueprint, request, jsonify
from app import get_db_connection
import psycopg2
from datetime import datetime
import uuid

pos_bp = Blueprint('pos', __name__)

@pos_bp.route('/api/pos/products', methods=['GET'])
def get_products():
    """Get all products with inventory for POS"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get products with current stock levels
        cur.execute("""
            SELECT 
                p.id,
                p.name,
                p.description,
                p.unit_price,
                p.cost_price,
                p.prescription_required,
                p.image_url,
                pc.name as category_name,
                pl.name as location_name,
                COALESCE(i.current_stock, 0) as current_stock,
                p.min_stock_level
            FROM products p
            LEFT JOIN product_categories pc ON p.category_id = pc.id
            LEFT JOIN product_locations pl ON p.location_id = pl.id
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.is_active = true
            ORDER BY p.name
        """)
        
        products = []
        for row in cur.fetchall():
            products.append({
                'id': row[0],
                'name': row[1],
                'description': row[2],
                'unit_price': float(row[3]),
                'cost_price': float(row[4]),
                'prescription_required': row[5],
                'image_url': row[6],
                'category_name': row[7],
                'location_name': row[8],
                'current_stock': row[9],
                'min_stock_level': row[10],
                'in_stock': row[9] > 0
            })
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'products': products
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@pos_bp.route('/api/pos/categories', methods=['GET'])
def get_categories():
    """Get all product categories"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT id, name, description FROM product_categories ORDER BY name")
        
        categories = []
        for row in cur.fetchall():
            categories.append({
                'id': row[0],
                'name': row[1],
                'description': row[2]
            })
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'categories': categories
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@pos_bp.route('/api/pos/process-sale', methods=['POST'])
def process_sale():
    """Process a complete sale transaction"""
    try:
        data = request.get_json()
        
        # Validate required fields (user_id optional, pharmacy_id inferred)
        required_fields = ['items', 'payment_method']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        items = data['items']
        payment_method = data['payment_method']
        user_id = data.get('user_id')
        pharmacy_id = data.get('pharmacy_id')
        customer_name = data.get('customer_name', '')
        discount_type = data.get('discount_type', '')
        discount_amount = data.get('discount_amount', 0)
        
        if not items or len(items) == 0:
            return jsonify({
                'success': False,
                'error': 'No items in cart'
            }), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Start transaction
        cur.execute("BEGIN")
        
        try:
            # Calculate totals (no tax, keep column as 0 to satisfy schema)
            subtotal = sum(item['quantity'] * item['unit_price'] for item in items)
            tax_amount = 0
            total_amount = subtotal + tax_amount - discount_amount
            
            # Infer pharmacy_id from first product if not provided
            if pharmacy_id is None and len(items) > 0:
                first_product_id = items[0]['product_id']
                cur.execute("SELECT pharmacy_id FROM products WHERE id = %s", (first_product_id,))
                ph_row = cur.fetchone()
                if ph_row:
                    pharmacy_id = ph_row[0]

            # Generate sale number
            sale_number = f"POS{datetime.now().strftime('%Y%m%d')}{str(uuid.uuid4())[:8].upper()}"
            
            # Prepare optional notes
            notes_parts = []
            if customer_name:
                notes_parts.append(f"Customer: {customer_name}")
            if discount_type:
                notes_parts.append(f"Discount: {discount_type}")
            notes_value = " | ".join(notes_parts) if notes_parts else None

            # Create sale record (align with schema: includes pharmacy_id and tax_amount column)
            cur.execute("""
                INSERT INTO sales (
                    sale_number, pharmacy_id, user_id, subtotal, tax_amount, discount_amount, 
                    payment_method, status, notes, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                sale_number, pharmacy_id, user_id, subtotal, tax_amount, discount_amount,
                payment_method, 'completed', 
                notes_value,
                datetime.now()
            ))
            
            sale_id = cur.fetchone()[0]
            
            # Create sale items and update inventory
            for item in items:
                product_id = item['product_id']
                quantity = item['quantity']
                unit_price = item['unit_price']
                total_price = quantity * unit_price
                
                # Create sale item
                cur.execute("""
                    INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (sale_id, product_id, quantity, unit_price, total_price, datetime.now()))
                
                # Update inventory
                cur.execute("""
                    UPDATE inventory 
                    SET current_stock = current_stock - %s,
                        last_updated = %s
                    WHERE product_id = %s
                """, (quantity, datetime.now(), product_id))
                
                # Note: inventory_transactions table may not exist in this schema; skipping logging here
            
            # Commit transaction
            cur.execute("COMMIT")
            
            # Get sale details for receipt
            cur.execute("""
                SELECT 
                    s.id, s.sale_number, s.subtotal, s.discount_amount, 
                    s.total_amount, s.payment_method, s.created_at,
                    u.first_name, u.last_name
                FROM sales s
                LEFT JOIN users u ON s.user_id = u.id
                WHERE s.id = %s
            """, (sale_id,))
            
            sale_data = cur.fetchone()
            
            # Get sale items for receipt
            cur.execute("""
                SELECT 
                    si.quantity, si.unit_price, si.total_price,
                    p.name as product_name
                FROM sale_items si
                JOIN products p ON si.product_id = p.id
                WHERE si.sale_id = %s
                ORDER BY si.id
            """, (sale_id,))
            
            sale_items = cur.fetchall()
            
            cur.close()
            conn.close()
            
            return jsonify({
                'success': True,
                'receipt': {
                    'id': sale_data[0],
                    'sale_number': sale_data[1],
                    'subtotal': float(sale_data[2]),
                    'discount_amount': float(sale_data[3]),
                    'total_amount': float(sale_data[4]),
                    'payment_method': sale_data[5],
                    'created_at': sale_data[6].isoformat(),
                    'customer_name': customer_name,
                    'items': [
                        {
                            'name': item[3],
                            'quantity': item[0],
                            'unit_price': float(item[1]),
                            'total_price': float(item[2])
                        }
                        for item in sale_items
                    ]
                }
            })
            
        except Exception as e:
            # Rollback transaction
            cur.execute("ROLLBACK")
            raise e
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@pos_bp.route('/api/pos/check-stock', methods=['POST'])
def check_stock():
    """Check if products have sufficient stock"""
    try:
        data = request.get_json()
        product_ids = data.get('product_ids', [])
        
        if not product_ids:
            return jsonify({
                'success': True,
                'stock_status': []
            })
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check stock for each product
        stock_status = []
        for product_id in product_ids:
            cur.execute("""
                SELECT 
                    p.name,
                    COALESCE(i.current_stock, 0) as current_stock,
                    p.min_stock_level
                FROM products p
                LEFT JOIN inventory i ON p.id = i.product_id
                WHERE p.id = %s
            """, (product_id,))
            
            result = cur.fetchone()
            if result:
                stock_status.append({
                    'product_id': product_id,
                    'product_name': result[0],
                    'current_stock': result[1],
                    'min_stock_level': result[2],
                    'in_stock': result[1] > 0
                })
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'stock_status': stock_status
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@pos_bp.route('/api/pos/transactions', methods=['GET'])
def get_transactions():
    """Get transaction history"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get all sales with items
        cur.execute("""
            SELECT 
                s.id, s.sale_number, s.subtotal, s.discount_amount, 
                s.total_amount, s.payment_method, s.created_at, s.notes
            FROM sales s
            ORDER BY s.created_at DESC
            LIMIT 100
        """)
        
        sales = cur.fetchall()
        
        transactions = []
        for sale in sales:
            # Get items for each sale
            cur.execute("""
                SELECT 
                    si.quantity, si.unit_price, si.total_price,
                    p.name as product_name
                FROM sale_items si
                JOIN products p ON si.product_id = p.id
                WHERE si.sale_id = %s
                ORDER BY si.id
            """, (sale[0],))
            
            sale_items = cur.fetchall()
            
            transactions.append({
                'id': sale[0],
                'sale_number': sale[1],
                'subtotal': float(sale[2]),
                'discount_amount': float(sale[3]),
                'total_amount': float(sale[4]),
                'payment_method': sale[5],
                'created_at': sale[6].isoformat(),
                'customer_name': sale[7].replace('Customer: ', '') if sale[7] and sale[7].startswith('Customer: ') else None,
                'items': [
                    {
                        'name': item[3],
                        'quantity': item[0],
                        'unit_price': float(item[1]),
                        'total_price': float(item[2])
                    }
                    for item in sale_items
                ]
            })
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'transactions': transactions
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
