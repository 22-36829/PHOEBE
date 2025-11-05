import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Loader2,
  Search,
  Package,
  MapPin,
  Info,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const AIAssistant = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Welcome to your AI Pharmacy Assistant! 🏥\n\nI\'m here to help you with:\n• 💊 Medicine recommendations and information\n• 📍 Product location assistance\n• 📊 Real-time inventory insights\n• 🎯 Smart search across 690+ medicines\n\nHow can I assist you today?',
      timestamp: new Date(),
      enhanced_mode: true,
      total_matches: 690
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [lastSearchMessage, setLastSearchMessage] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const messagesEndRef = useRef(null);

  const ADVANCED_COMMANDS = ['show more', 'show all', 'show 5', 'show 10'];

  // Prevent body scrolling when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageOverride) => {
    const rawMessage = typeof messageOverride === 'string' ? messageOverride : inputMessage;
    const messageToSend = rawMessage.trim();

    if (!messageToSend || isLoading) return;

    const lowerMessage = messageToSend.toLowerCase();
    const isAdvancedCommand = ADVANCED_COMMANDS.includes(lowerMessage);

    if (isAdvancedCommand && !lastSearchMessage) {
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: messageToSend,
        timestamp: new Date(),
      };
      const helperResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Try asking an inventory or medicine question first before using advanced commands like “show more”.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage, helperResponse]);
      setInputMessage('');
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: messageToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const token = localStorage.getItem('token');
      const storedUserId = localStorage.getItem('userId');
      const userId = storedUserId || `user_${Date.now()}`;
      const storedPharmacyId = localStorage.getItem('pharmacy_id');
      const pharmacyId = storedPharmacyId ? Number(storedPharmacyId) : null;

      if (!storedUserId) {
        localStorage.setItem('userId', userId);
      }

      const response = await fetch('/api/ai/enhanced/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: isAdvancedCommand ? `${lastSearchMessage} ${messageToSend}` : messageToSend,
          user_id: userId,
          pharmacy_id: pharmacyId
        })
      });

      const responseBody = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage = responseBody.error || 'The assistant is temporarily unavailable.';
        throw new Error(errorMessage);
      }

      if (!responseBody.success || !responseBody.response) {
        const failureReason = responseBody.error || 'Received an unexpected response from the AI service.';
        throw new Error(failureReason);
      }

      const payload = responseBody.response;
      if (!isAdvancedCommand) {
        setLastSearchMessage(messageToSend);
      }
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: payload.message,
        timestamp: new Date(),
        data: payload.data,
        responseType: payload.type,
        classification: payload.classification,
        followUp: payload.follow_up,
        learned: payload.learned || false,
        entities: payload.entities,
        sentiment: payload.sentiment,
        contextual_info: payload.contextual_info,
        user_goal: payload.user_goal,
        semantic_results: payload.semantic_results,
        reasoning_chain: payload.reasoning_chain,
        response_time: payload.response_time,
        ultra_mode: payload.ultra_mode || false,
        enhanced_mode: payload.enhanced_mode || false,
        search_analysis: payload.search_analysis,
        total_matches: payload.total_matches,
        pagination: payload.pagination,
        confidence: payload.confidence
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error calling AI API:', error);
      const friendlyMessage = typeof error?.message === 'string' ? error.message : 'Please try again in a few moments.';
      const errorResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: `Sorry, I ran into an issue: ${friendlyMessage}`,
        timestamp: new Date(),
        error: true
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFeedback = async (messageId, feedback) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;
      const storedPharmacyId = localStorage.getItem('pharmacy_id');

      await fetch('/api/ai/learn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          user_id: 'user_' + Date.now(),
          message: message.content,
          intent: message.classification?.intent || 'generic_query',
          feedback_score: feedback === 'positive' ? 0.8 : 0.2,
          pharmacy_id: storedPharmacyId ? Number(storedPharmacyId) : null
        })
      });

      // Update message with feedback
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, feedback: feedback }
          : m
      ));
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion.text);
  };

  const toggleSection = (sectionIndex) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionIndex]: !prev[sectionIndex]
    }));
  };

  const handleExampleClick = (example) => {
    handleSendMessage(example);
  };


  const tutorialSections = [
    {
      title: '🔍 Smart Search',
      shortDesc: 'Search medicines by name, type, or symptoms',
      description: 'Ask about medicines by name, type, or symptoms',
      icon: Search,
      color: 'bg-blue-500',
      examples: [
        'Find Amlodipine 5mg tablets',
        'Show me Biogesic tablets',
        'What blood pressure medicines do you have?',
        'Medicine for headache'
      ],
      tip: 'Use specific medicine names for best results!'
    },
    {
      title: '📊 Inventory Control',
      shortDesc: 'Check stock levels and availability',
      description: 'Check stock levels and availability',
      icon: Package,
      color: 'bg-green-500',
      examples: [
        'Show me out of stock items',
        'Show low quantity medicines',
        'Check Amlodipine 5mg stock',
        'Show inventory summary'
      ],
      tip: 'Ask "show more" or "show less" to control results!'
    },
    {
      title: '📍 Product Locator',
      shortDesc: 'Find where products are located',
      description: 'Find where products are located',
      icon: MapPin,
      color: 'bg-orange-500',
      examples: [
        'Where is Aspilets 80MG located?',
        'Find Ceelin Syrup 60ML',
        'Locate blood pressure medicines',
        'Where are the vitamins?'
      ],
      tip: 'I know your pharmacy layout!'
    },
    {
      title: '💊 Medicine Info',
      shortDesc: 'Learn about uses, benefits, and side effects',
      description: 'Learn about uses, benefits, and side effects',
      icon: Info,
      color: 'bg-indigo-500',
      examples: [
        'What is Amlodipine 5MG used for?',
        'Benefits of Ceelin Drops',
        'How to use Catapres 75MG?',
        'What is Aspilets 80MG for?'
      ],
      tip: 'I can explain medical information clearly!'
    },
    {
      title: '🎯 Advanced Features',
      shortDesc: 'Use smart commands for better results',
      description: 'Use smart commands for better results',
      icon: Sparkles,
      color: 'bg-purple-500',
      examples: [
        'show more',
        'show all',
        'show 5',
        'show 10'
      ],
      tip: 'Type the commands exactly as shown to adjust pagination instantly.'
    }
  ];

  return (
    <>
    <div className="h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex flex-col overflow-hidden">
      {/* Professional Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 dark:bg-slate-950/80 dark:border-slate-800 flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">AI Pharmacy Assistant</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Live inventory insight • Context-aware guidance • Auditable decisions</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-emerald-700">Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* System intelligence quick info */}

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Main Chat Interface */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto chat-container">
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in-0 slide-in-from-bottom-2 duration-300`}
                >
                  <div className={`flex items-start space-x-4 max-w-3xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {/* Avatar */}
                    {message.type === 'bot' && (
                      <div className="w-9 h-9 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {message.type === 'user' && (
                      <div className="w-9 h-9 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-semibold">U</span>
                      </div>
                    )}
                    
                    {/* Message Content */}
                    <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block px-5 py-4 rounded-2xl shadow-sm border ${
                        message.type === 'user'
                          ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-700 rounded-br-lg'
                          : 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800 rounded-bl-lg'
                      }`}>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{message.content}</div>
                        
                        {/* Enhanced AI Badge */}
                        {message.type === 'bot' && message.enhanced_mode && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-1.5 px-2 py-1 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-lg border border-emerald-200 dark:border-emerald-500/30">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Enhanced AI</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">•</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{message.total_matches || 690} medicines</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Timestamp */}
                      <div className={`mt-2 text-xs text-slate-500 dark:text-slate-400 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Loading State */}
              {isLoading && (
                <div className="flex justify-start animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                  <div className="flex items-start space-x-4 max-w-3xl">
                    <div className="w-9 h-9 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white dark:bg-slate-950 px-5 py-4 rounded-2xl rounded-bl-lg shadow-sm border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center space-x-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">Analyzing your request...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Professional Input Area */}
          <div className="bg-white/80 backdrop-blur-sm border-t border-slate-200/60 dark:bg-slate-950/80 dark:border-slate-800 shadow-lg flex-shrink-0">
            <div className="max-w-4xl mx-auto px-6 py-6">
              <div className="relative">
                <div className="relative">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about medicines, inventory, or product information..."
                    className="w-full px-5 py-4 pr-14 border border-slate-300 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-slate-400 focus:border-slate-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-500 resize-none transition-all duration-200 shadow-sm"
                    disabled={isLoading}
                    rows={1}
                    style={{ minHeight: '52px', maxHeight: '140px' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2.5 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl hover:from-slate-700 hover:to-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    AI-powered responses • Verify important medical information
                  </p>
              <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span className="font-medium">Enhanced AI Active</span>
                <button
                  onClick={() => setShowInfoModal(true)}
                  className="ml-3 inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  How it works
                </button>
              </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Permanent Tutorial Sidebar */}
        <div className="w-80 bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm border-l border-slate-200/60 dark:border-slate-800 shadow-lg flex flex-col tutorial-sidebar flex-shrink-0">
          {/* Sticky Tutorial Header */}
          <div className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border-b border-slate-200/60 dark:border-slate-800 p-4 flex-shrink-0">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">AI Tutorial</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">Learn how to use your AI Assistant</p>
            </div>
          </div>
          
          {/* Scrollable Tutorial Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4 space-y-4">

            {/* Tutorial Sections */}
            <div className="space-y-3">
              {tutorialSections.map((section, index) => (
                <div key={index} className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(index)}
                    className={`w-full ${section.color} p-3 text-left transition-all duration-200 hover:opacity-90`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <section.icon className="w-4 h-4 text-white" />
                        <div>
                          <h3 className="text-sm font-semibold text-white">{section.title}</h3>
                          <p className="text-xs text-white/90">{section.shortDesc}</p>
                        </div>
                      </div>
                      {expandedSections[index] ? (
                        <ChevronUp className="w-4 h-4 text-white" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </button>

                  {/* Expandable Content */}
                  {expandedSections[index] && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 animate-in slide-in-from-top-2 duration-200">
                      <div className="space-y-3">
                        {/* Examples */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">Try these examples:</h4>
                          <div className="space-y-1">
                            {section.examples.map((example, exIndex) => (
                              <button
                                key={exIndex}
                                onClick={() => handleExampleClick(example)}
                                className="w-full text-left p-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-950 hover:shadow-sm rounded-lg transition-all border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                              >
                                💡 "{example}"
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Pro Tip */}
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-500/30">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs">💡</span>
                            <span className="text-xs font-medium text-amber-800 dark:text-amber-300">{section.tip}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* System Status */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2 tracking-wide uppercase">System Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-500/30">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">AI System</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Online</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-500/30">
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Medicines</span>
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">690+</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-500/30">
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Categories</span>
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">6</span>
                </div>
              </div>
            </div>

            {/* Pro Tips */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              <div className="p-3 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-500/30">
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-900 dark:text-purple-200">Pro Tips</span>
                </div>
                <ul className="text-xs text-purple-800 dark:text-purple-200 space-y-1">
                  <li>• Use specific medicine names</li>
                  <li>• Ask about stock levels</li>
                  <li>• Request product locations</li>
                  <li>• Try different phrasings</li>
                </ul>
              </div>
            </div>
          </div>
          </div>
        </div>

      </div>
    </div>

    {showInfoModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
        <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-950 shadow-2xl">
          <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-800 dark:text-slate-200" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Phoebe AI – How it stays reliable</h3>
            </div>
            <button
              onClick={() => setShowInfoModal(false)}
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="px-6 py-5 space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Live inventory data, privacy-first</p>
              <p className="mt-1 text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                Responses pull stock, pricing, and locations directly from the database. Only anonymized daily metrics are saved—never full chat transcripts.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Automated accuracy loop</p>
              <p className="mt-1 text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                Aggregated metrics trigger weekly retraining of synonyms and embeddings. Every update runs regression tests before going live.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Instant pagination controls</p>
              <p className="mt-1 text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                Use commands like “show more”, “show all”, or “show 5” after your initial query to explore the result set.
              </p>
            </div>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-3 flex justify-end gap-2">
            <button
              onClick={() => setShowInfoModal(false)}
              className="rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default AIAssistant;
