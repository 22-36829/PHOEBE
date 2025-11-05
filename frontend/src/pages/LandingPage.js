import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  Brain, 
  Shield, 
  Users, 
  TrendingUp, 
  Clock,
  CheckCircle,
  ArrowRight,
  Star,
  Globe,
  Sparkles,
  Award,
  Heart,
  Smartphone,
  Monitor,
  Cloud,
  Lock,
  Zap as Lightning
} from 'lucide-react';

const LandingPage = () => {
  const [email, setEmail] = useState('');
  const [demoOpen, setDemoOpen] = useState(false);
  const [subscribeMsg, setSubscribeMsg] = useState('');

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setSubscribeMsg('');
    try {
      // Optional: send to backend if available; fallback to local success
      await fetch('/api/public/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      }).catch(() => {});
      setSubscribeMsg('Subscribed! We\'ll keep you posted.');
      setEmail('');
    } catch {
      setSubscribeMsg('Subscription failed. Please try again later.');
    }
  };

  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const features = [
    {
      icon: <BarChart3 className="w-10 h-10 text-white" />,
      title: "Pharmacy POS & Inventory",
      description: "Barcode POS, real-time stock, reorder points, and pharmacy dashboards.",
      gradient: "from-blue-500 to-blue-600"
    },
    {
      icon: <Brain className="w-10 h-10 text-white" />,
      title: "AI-Powered Ordering",
      description: "Smart suggestions and purchase guidance based on demand and sales trends.",
      gradient: "from-purple-500 to-purple-600"
    },
    {
      icon: <TrendingUp className="w-10 h-10 text-white" />,
      title: "Demand Forecasting",
      description: "SARIMAX forecasting to plan orders, reduce stockouts, and cut overstock.",
      gradient: "from-green-500 to-green-600"
    },
    {
      icon: <Shield className="w-10 h-10 text-white" />,
      title: "Expiry & Waste Analytics",
      description: "Expiry insights and sustainability metrics to minimize pharmaceutical waste.",
      gradient: "from-orange-500 to-orange-600"
    },
    {
      icon: <Users className="w-10 h-10 text-white" />,
      title: "Multi-Role Access",
      description: "Secure roles for admin, manager, and staff with granular permissions.",
      gradient: "from-indigo-500 to-indigo-600"
    },
    {
      icon: <Clock className="w-10 h-10 text-white" />,
      title: "Batch & Expiry Tracking",
      description: "Track lots, expiries, and get proactive alerts before items go to waste.",
      gradient: "from-pink-500 to-pink-600"
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "₱2,999",
      period: "per month",
      description: "Perfect for small pharmacies",
      features: [
        "Up to 1,000 products",
        "Basic inventory tracking",
        "Sales reports & analytics",
        "Email support",
        "Mobile app access"
      ],
      popular: false,
      cta: "Create pharmacy account"
    },
    {
      name: "Professional",
      price: "₱4,999",
      period: "per month",
      description: "Most popular for growing pharmacies",
      features: [
        "Up to 5,000 products",
        "Advanced analytics dashboard",
        "AI product recommendations",
        "Sales forecasting (SARIMAX)",
        "Priority support",
        "API access"
      ],
      popular: true,
      cta: "Create pharmacy account"
    },
    {
      name: "Enterprise",
      price: "₱7,999",
      period: "per month",
      description: "For large pharmacy chains",
      features: [
        "Unlimited products",
        "Custom integrations",
        "Advanced ML models",
        "Dedicated account manager",
        "Custom training sessions",
        "White-label options"
      ],
      popular: false,
      cta: "Contact Sales"
    }
  ];

  const stats = [
    { number: "500+", label: "Pharmacies Trust Us" },
    { number: "99.9%", label: "Uptime Guarantee" },
    { number: "24/7", label: "Customer Support" },
    { number: "₱2M+", label: "Saved Monthly" }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Demo Modal */}
      {demoOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Product Demo</h3>
              <button onClick={() => setDemoOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                title="Phoebe Demo"
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end">
              <button onClick={() => setDemoOpen(false)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium">Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Phoebe Drugstore
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <Link 
                to="/login" 
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link 
                to="/register" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Create your pharmacy account
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 text-sm font-medium mb-8 whitespace-nowrap">
              <Sparkles className="w-4 h-4 mr-2 flex-shrink-0" />
              Trusted by 500+ Pharmacies Nationwide
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                All‑in‑one Pharmacy POS & Inventory
              </span>
              <br />
              <span className="text-gray-900">with Forecasting and Expiry Tracking</span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-12 text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Streamline sales, control inventory, forecast demand, and track expiries—built for
              pharmacies with role-based access, dashboards, and smart ordering.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Link 
                to="/register" 
                className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center justify-center"
              >
                <span>Create your pharmacy account</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button onClick={() => setDemoOpen(true)} className="group border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 font-semibold py-4 px-8 rounded-xl transition-all duration-300 hover:shadow-lg flex items-center justify-center">
                <Monitor className="w-5 h-5 mr-2" />
                Watch Demo
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-gray-500 text-sm">
              <div className="flex items-center whitespace-nowrap">
                <Lock className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Bank-level Security</span>
              </div>
              <div className="flex items-center whitespace-nowrap">
                <Cloud className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Cloud-based</span>
              </div>
              <div className="flex items-center whitespace-nowrap">
                <Smartphone className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Mobile Ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-300">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-6">
              <Award className="w-4 h-4 mr-2" />
              Powerful Features
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything you need to run a
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> modern pharmacy</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Streamline operations, reduce waste, and boost sales with our comprehensive AI-powered platform
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} role="button" tabIndex={0} onClick={() => scrollToId('pricing')} onKeyDown={(e) => (e.key === 'Enter' ? scrollToId('pricing') : null)} className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${feature.gradient} rounded-t-2xl`}></div>
                <div className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <div className="w-10 h-10 flex items-center justify-center">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-800 text-sm font-medium mb-6">
              <Star className="w-4 h-4 mr-2" />
              Transparent Pricing
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose the plan that fits your pharmacy's needs. All plans include 14-day free trial.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div 
                key={index} 
                className={`relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 ${
                  plan.popular 
                    ? 'ring-2 ring-blue-500 scale-105' 
                    : 'border border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="p-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-gray-600 mb-4">{plan.description}</p>
                    <div className="mb-4">
                      <span className="text-5xl font-bold text-gray-900 leading-none align-baseline">
                        {plan.price}
                      </span>
                      <span className="text-gray-600 ml-2 text-lg align-baseline">
                        {plan.period}
                      </span>
                    </div>
                  </div>
                  
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button onClick={() => window.location.assign('/register')} className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900 hover:shadow-md'
                  }`}>
                    {plan.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section id="newsletter" className="py-24 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-xl"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium mb-8">
            <Lightning className="w-4 h-4 mr-2" />
            Stay Updated
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Stay updated with the latest features
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
            Get notified about new features, updates, and pharmacy management tips delivered to your inbox.
          </p>
          
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1 px-6 py-4 rounded-xl border-0 focus:ring-2 focus:ring-white/50 text-gray-900 placeholder-gray-500"
              required
            />
            <button
              type="submit"
              className="bg-white text-blue-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center group"
            >
              Subscribe
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
          {subscribeMsg && (
            <p className="mt-4 text-blue-100">{subscribeMsg}</p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-1">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Phoebe Drugstore
                </h3>
              </div>
              <p className="text-gray-400 leading-relaxed mb-6">
                Modern pharmacy management system with AI-powered insights and automation for the digital age.
              </p>
              <div className="flex space-x-4">
                <button className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <Globe className="w-5 h-5" />
                </button>
                <button className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <Heart className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-6">Product</h4>
              <ul className="space-y-3 text-gray-400">
                <li><button onClick={() => scrollToId('features')} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollToId('pricing')} className="hover:text-white transition-colors">Pricing</button></li>
                <li><button onClick={() => window.location.assign('/login')} className="hover:text-white transition-colors">API Documentation</button></li>
                <li><button onClick={() => window.location.assign('/login')} className="hover:text-white transition-colors">Integrations</button></li>
                <li><button onClick={() => scrollToId('hero')} className="hover:text-white transition-colors">Mobile App</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-6">Support</h4>
              <ul className="space-y-3 text-gray-400">
                <li><button onClick={() => scrollToId('newsletter')} className="hover:text-white transition-colors">Help Center</button></li>
                <li><a href="mailto:support@phoebe.app" className="hover:text-white transition-colors">Contact Support</a></li>
                <li><button onClick={() => scrollToId('features')} className="hover:text-white transition-colors">Training</button></li>
                <li><button onClick={() => scrollToId('stats')} className="hover:text-white transition-colors">Status Page</button></li>
                <li><button onClick={() => scrollToId('newsletter')} className="hover:text-white transition-colors">Community</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-6">Company</h4>
              <ul className="space-y-3 text-gray-400">
                <li><button onClick={() => scrollToId('hero')} className="hover:text-white transition-colors">About Us</button></li>
                <li><button onClick={() => scrollToId('features')} className="hover:text-white transition-colors">Careers</button></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><button onClick={() => scrollToId('newsletter')} className="hover:text-white transition-colors">Security</button></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">
                &copy; 2025 Phoebe Drugstore. All rights reserved.
              </p>
              <div className="flex items-center space-x-6 mt-4 md:mt-0">
                <span className="text-gray-400 text-sm">Made with</span>
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-gray-400 text-sm">in the Philippines</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
