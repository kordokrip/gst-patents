/**
 * Enhanced Search & RAG Integration Module
 * 검색 제안, AI 채팅, 벡터 검색 준비
 */

// Ensure GST namespace exists even if main.js has not executed yet
window.GST = window.GST || {};
const DEFAULT_RAG_CONFIG = {
    ENABLED: false,
    API_ENDPOINT: '/api/rag',
    VECTOR_DB_ENDPOINT: '/api/vector-search',
    CHAT_ENDPOINT: '/api/chat',
    MAX_CONTEXT_LENGTH: 4000,
    SIMILARITY_THRESHOLD: 0.7
};

// Search Suggestions 관리
class SearchSuggestions {
    constructor() {
        this.suggestions = [];
        this.maxSuggestions = 8;
        this.currentIndex = -1;
    }
    
    /**
     * 검색 제안 생성
     */
    generateSuggestions(query, patents) {
        if (!query || query.length < 2) return [];
        
        const suggestions = new Set();
        const queryLower = query.toLowerCase();
        
        // Patent numbers matching
        patents.forEach(patent => {
            const patentNumber = (patent.patent_number || '').toLowerCase();
            if (patentNumber && patentNumber.includes(queryLower)) {
                suggestions.add({
                    type: 'patent_number',
                    text: patent.patent_number,
                    label: `특허번호: ${patent.patent_number}`,
                    icon: 'fa-file-alt',
                    patent: patent
                });
            }
        });
        
        // Technology fields matching
        const techFields = [...new Set(patents
            .map(p => p.technology_field)
            .filter(field => typeof field === 'string' && field.trim().length))];
        techFields.forEach(field => {
            const lower = field.toLowerCase();
            if (lower.includes(queryLower)) {
                suggestions.add({
                    type: 'tech_field',
                    text: field,
                    label: `기술분야: ${field}`,
                    icon: 'fa-cogs',
                    count: patents.filter(p => p.technology_field === field).length
                });
            }
        });
        
        // Title keywords
        const titleKeywords = this.extractKeywords(patents, queryLower);
        titleKeywords.forEach(keyword => {
            suggestions.add({
                type: 'keyword',
                text: keyword,
                label: `키워드: ${keyword}`,
                icon: 'fa-key',
                count: patents.filter(p => 
                    (p.title || '').toLowerCase().includes(keyword.toLowerCase())
                ).length
            });
        });
        
        // Inventor names
        const inventors = [...new Set(
            patents.flatMap(p => Array.isArray(p.inventors) ? p.inventors : [])
        )];
        inventors.forEach(inventor => {
            if (inventor.toLowerCase().includes(queryLower)) {
                suggestions.add({
                    type: 'inventor',
                    text: inventor,
                    label: `발명자: ${inventor}`,
                    icon: 'fa-user',
                    count: patents.filter(p => 
                        p.inventors && p.inventors.includes(inventor)
                    ).length
                });
            }
        });
        
        return Array.from(suggestions).slice(0, this.maxSuggestions);
    }
    
    /**
     * 키워드 추출
     */
    extractKeywords(patents, query) {
        const keywords = new Set();
        const stopWords = ['시스템', '장치', '방법', '기술', '설비', '제어', '처리'];
        
        patents.forEach(patent => {
            const title = (patent.title || '').toLowerCase();
            if (title.includes(query)) {
                const words = (patent.title || '')
                    .split(/[\s,.-]+/)
                    .filter(word => 
                        word.length > 1 && 
                        !stopWords.includes(word) &&
                        word.toLowerCase().includes(query)
                    );
                words.forEach(word => keywords.add(word));
            }
        });
        
        return Array.from(keywords);
    }
}

// AI Chat Interface (RAG 준비)
class AIChatInterface {
    constructor() {
        const globalConfig = (window.GST_CONFIG && window.GST_CONFIG.RAG_CONFIG) || {};
        this.config = {
            ...DEFAULT_RAG_CONFIG,
            ...globalConfig
        };

        this.isEnabled = Boolean(this.config.ENABLED);
        this.messages = [];
        this.isTyping = false;
        this.contextWindow = [];
        
        this.initializeInterface();
    }
    
    initializeInterface() {
        if (!this.isEnabled) {
            console.log('🤖 AI Chat Interface initialized (disabled - waiting for RAG)');
            return;
        }
        
        this.bindEvents();
        console.log('🤖 AI Chat Interface initialized and ready');
    }
    
    bindEvents() {
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-message');
        const closeButton = document.getElementById('close-chat');
        
        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendMessage());
        }
        
        if (closeButton) {
            closeButton.addEventListener('click', () => this.toggleChat(false));
        }
    }
    
    async sendMessage() {
        if (!this.isEnabled) {
            this.showNotEnabledMessage();
            return;
        }
        
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();
        
        if (!message) return;
        
        // Add user message
        this.addMessage('user', message);
        chatInput.value = '';
        
        // Show typing indicator
        this.showTyping();
        
        try {
            // Here we would call the RAG API
            const response = await this.queryRAG(message);
            this.hideTyping();
            this.addMessage('assistant', response);
            
        } catch (error) {
            this.hideTyping();
            this.addMessage('assistant', '죄송합니다. 현재 시스템에 문제가 있어 답변을 드릴 수 없습니다.');
            console.error('RAG query error:', error);
        }
    }
    
    async queryRAG(message) {
        // RAG 시스템 연동 준비
        // 실제 구현 시 벡터 검색 + LLM 호출
        
        if (!this.config.ENABLED) {
            throw new Error('RAG system not enabled');
        }
        
        // Simulate RAG response (실제로는 백엔드 API 호출)
        const response = await fetch(this.config.CHAT_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                context: this.contextWindow,
                patents_context: this.getRelevantPatentsContext(message)
            })
        });
        
        if (!response.ok) {
            throw new Error(`RAG API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.response;
    }
    
    getRelevantPatentsContext(message) {
        // 관련 특허 컨텍스트 추출
        const relevantPatents = window.patentsData.filter(patent => {
            const searchableText = [
                patent.title,
                patent.abstract,
                patent.technology_field
            ].join(' ').toLowerCase();
            
            const messageWords = message.toLowerCase().split(/\s+/);
            return messageWords.some(word => searchableText.includes(word));
        });
        
        return relevantPatents.slice(0, 5).map(patent => ({
            patent_number: patent.patent_number,
            title: patent.title,
            abstract: patent.abstract,
            technology_field: patent.technology_field
        }));
    }
    
    addMessage(type, content) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        
        if (type === 'user') {
            messageDiv.innerHTML = `
                <div class="flex justify-end">
                    <div class="bg-blue-600 text-white px-4 py-2 rounded-lg max-w-xs lg:max-w-md">
                        ${this.escapeHtml(content)}
                    </div>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="flex justify-start">
                    <div class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg max-w-xs lg:max-w-md">
                        <i class="fas fa-robot text-blue-600 mr-2"></i>
                        ${this.formatAssistantMessage(content)}
                    </div>
                </div>
            `;
        }
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Store in memory
        this.messages.push({ type, content, timestamp: Date.now() });
        
        // Limit message history
        if (this.messages.length > 50) {
            this.messages = this.messages.slice(-50);
        }
    }
    
    formatAssistantMessage(content) {
        // Format assistant response with patent references
        let formatted = this.escapeHtml(content);
        
        // Convert patent numbers to links
        formatted = formatted.replace(
            /10-\d{7,}/g,
            '<span class="patent-ref font-mono text-blue-600 cursor-pointer" onclick="GST.searchPatentNumber(\'$&\')">$&</span>'
        );
        
        return formatted;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showTyping() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="flex justify-start">
                <div class="bg-gray-200 px-4 py-2 rounded-lg">
                    <i class="fas fa-robot text-blue-600 mr-2"></i>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        this.isTyping = true;
    }
    
    hideTyping() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
        this.isTyping = false;
    }
    
    showNotEnabledMessage() {
        this.addMessage('assistant', 
            '🔧 AI 채팅 기능은 현재 개발 중입니다. RAG 벡터 데이터베이스와 LLM 모델 연동이 완료되면 활성화됩니다.\n\n' +
            '준비 중인 기능:\n' +
            '• 특허 문서 벡터 검색\n' +
            '• LLM 기반 특허 분석\n' +
            '• 자연어 질의응답\n' +
            '• 유사 특허 추천'
        );
    }
    
    toggleChat(show = null) {
        const chatInterface = document.getElementById('ai-chat-interface');
        if (!chatInterface) return;
        
        const isVisible = !chatInterface.classList.contains('hidden');
        const shouldShow = show !== null ? show : !isVisible;
        
        if (shouldShow) {
            chatInterface.classList.remove('hidden');
            chatInterface.classList.add('active');
            
            // Focus on input
            const chatInput = document.getElementById('chat-input');
            if (chatInput && this.isEnabled) {
                setTimeout(() => chatInput.focus(), 100);
            }
            
            // Add welcome message if first time
            if (this.messages.length === 0) {
                if (this.isEnabled) {
                    this.addMessage('assistant', 
                        '안녕하세요! GST 특허 분석 AI입니다. 특허에 대해 무엇이든 물어보세요.'
                    );
                } else {
                    this.showNotEnabledMessage();
                }
            }
        } else {
            chatInterface.classList.add('hidden');
            chatInterface.classList.remove('active');
        }
    }
}

// Search Suggestions UI 관리
function showSearchSuggestions() {
    const searchInput = document.getElementById('search-input');
    const suggestionsContainer = document.getElementById('search-suggestions');
    
    if (!searchInput || !suggestionsContainer || !window.patentsData) return;
    
    const query = searchInput.value.trim();
    if (query.length < 2) {
        hideSearchSuggestions();
        return;
    }
    
    const searchSuggestions = new SearchSuggestions();
    const suggestions = searchSuggestions.generateSuggestions(query, window.patentsData);
    
    if (suggestions.length === 0) {
        hideSearchSuggestions();
        return;
    }
    
    suggestionsContainer.innerHTML = suggestions.map((suggestion, index) => `
        <div class="search-suggestion-item" 
             data-index="${index}" 
             data-text="${suggestion.text}"
             onclick="selectSuggestion('${suggestion.text}')">
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <i class="fas ${suggestion.icon} text-gray-400 mr-3"></i>
                    <div>
                        <div class="font-medium">${highlightMatch(suggestion.label, query)}</div>
                        ${suggestion.count ? `<div class="text-xs text-gray-500">${suggestion.count}개 결과</div>` : ''}
                    </div>
                </div>
                <i class="fas fa-arrow-right text-gray-300"></i>
            </div>
        </div>
    `).join('');
    
    suggestionsContainer.classList.remove('hidden');
}

function hideSearchSuggestions() {
    const suggestionsContainer = document.getElementById('search-suggestions');
    if (suggestionsContainer) {
        suggestionsContainer.classList.add('hidden');
    }
}

function selectSuggestion(text) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = text;
        if (window.AppState) {
            window.AppState.searchQuery = text;
        }
        if (typeof performSearch === 'function') {
            performSearch(text, new AbortController().signal);
        }
    }
    hideSearchSuggestions();
}

function highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="suggestion-highlight">$1</span>');
}

function handleSearchKeydown(event) {
    const suggestionsContainer = document.getElementById('search-suggestions');
    if (!suggestionsContainer || suggestionsContainer.classList.contains('hidden')) return;
    
    const suggestions = suggestionsContainer.querySelectorAll('.search-suggestion-item');
    let currentIndex = Array.from(suggestions).findIndex(item => 
        item.classList.contains('highlighted')
    );
    
    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            currentIndex = Math.min(currentIndex + 1, suggestions.length - 1);
            break;
            
        case 'ArrowUp':
            event.preventDefault();
            currentIndex = Math.max(currentIndex - 1, -1);
            break;
            
        case 'Enter':
            event.preventDefault();
            if (currentIndex >= 0) {
                const selectedItem = suggestions[currentIndex];
                const text = selectedItem.getAttribute('data-text');
                selectSuggestion(text);
            }
            return;
            
        case 'Escape':
            hideSearchSuggestions();
            return;
            
        default:
            return;
    }
    
    // Update highlighting
    suggestions.forEach((item, index) => {
        if (index === currentIndex) {
            item.classList.add('highlighted', 'bg-blue-50');
        } else {
            item.classList.remove('highlighted', 'bg-blue-50');
        }
    });
}

function updateSearchSuggestions(query, results) {
    // Update search suggestions based on current results
    if (results.length === 0) {
        hideSearchSuggestions();
    } else if (results.length < 3) {
        // Show detailed results when few matches
        showDetailedSearchResults(results);
    }
}

function showDetailedSearchResults(results) {
    const suggestionsContainer = document.getElementById('search-suggestions');
    if (!suggestionsContainer) return;
    
    suggestionsContainer.innerHTML = results.slice(0, 3).map(patent => `
        <div class="search-suggestion-item"${window.GST && typeof window.GST.viewPatentDetail === 'function' ? ` onclick="GST.viewPatentDetail('${patent.id}')"` : ''}>
            <div class="flex items-start">
                <i class="fas fa-file-alt text-blue-500 mr-3 mt-1"></i>
                <div class="flex-1">
                    <div class="font-medium text-sm">${patent.title}</div>
                    <div class="text-xs text-gray-500">${patent.patent_number}</div>
                    <div class="text-xs text-gray-400 mt-1 line-clamp-2">${patent.abstract}</div>
                </div>
            </div>
        </div>
    `).join('');
    
    suggestionsContainer.classList.remove('hidden');
}

// Advanced Search Modal
function showAdvancedSearch() {
    const modal = createAdvancedSearchModal();
    document.body.appendChild(modal);
    
    // Focus first input
    const firstInput = modal.querySelector('input');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

function createAdvancedSearchModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-xl font-semibold text-gray-900">고급 검색</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <form id="advanced-search-form" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">특허번호</label>
                            <input type="text" name="patent_number" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="10-0000000">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">기술분야</label>
                            <select name="tech_field" 
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                <option value="">전체</option>
                                <option value="스크러버">스크러버</option>
                                <option value="칠러">칠러</option>
                                <option value="플라즈마">플라즈마</option>
                                <option value="온도제어">온도제어</option>
                                <option value="가스처리">가스처리</option>
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">발명명칭</label>
                        <input type="text" name="title" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                               placeholder="시스템, 장치, 방법 등">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">발명자</label>
                        <input type="text" name="inventor" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                               placeholder="발명자명">
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">등록일 (시작)</label>
                            <input type="date" name="date_from" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">등록일 (끝)</label>
                            <input type="date" name="date_to" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">특허상태</label>
                        <div class="flex space-x-4">
                            <label class="flex items-center">
                                <input type="checkbox" name="status" value="active" class="mr-2">
                                활성
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" name="status" value="expired" class="mr-2">
                                만료
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" name="status" value="pending" class="mr-2">
                                심사중
                            </label>
                        </div>
                    </div>
                </form>
                
                <div class="flex justify-end space-x-3 mt-6 pt-4 border-t">
                    <button onclick="this.closest('.fixed').remove()" 
                            class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        취소
                    </button>
                    <button onclick="executeAdvancedSearch()" 
                            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        검색
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

function executeAdvancedSearch() {
    const form = document.getElementById('advanced-search-form');
    if (!form) return;
    
    const formData = new FormData(form);
    const searchCriteria = {};
    
    for (let [key, value] of formData.entries()) {
        if (value.trim()) {
            if (searchCriteria[key]) {
                if (Array.isArray(searchCriteria[key])) {
                    searchCriteria[key].push(value);
                } else {
                    searchCriteria[key] = [searchCriteria[key], value];
                }
            } else {
                searchCriteria[key] = value;
            }
        }
    }
    
    // Execute advanced search
    const results = performAdvancedSearch(searchCriteria);
    renderPatentsTable(results);
    
    // Close modal
    const modal = form.closest('.fixed');
    if (modal) modal.remove();
    
    // Update search summary
    showSearchSummary(searchCriteria, results.length);
}

function performAdvancedSearch(criteria) {
    let results = window.patentsData || [];
    
    if (criteria.patent_number) {
        results = results.filter(p => 
            p.patent_number.toLowerCase().includes(criteria.patent_number.toLowerCase())
        );
    }
    
    if (criteria.title) {
        results = results.filter(p => 
            p.title.toLowerCase().includes(criteria.title.toLowerCase())
        );
    }
    
    if (criteria.tech_field) {
        results = results.filter(p => 
            p.technology_field === criteria.tech_field
        );
    }
    
    if (criteria.inventor) {
        results = results.filter(p => 
            p.inventors && p.inventors.some(inv => 
                inv.toLowerCase().includes(criteria.inventor.toLowerCase())
            )
        );
    }
    
    if (criteria.date_from) {
        results = results.filter(p => 
            new Date(p.registration_date) >= new Date(criteria.date_from)
        );
    }
    
    if (criteria.date_to) {
        results = results.filter(p => 
            new Date(p.registration_date) <= new Date(criteria.date_to)
        );
    }
    
    if (criteria.status) {
        const statusArray = Array.isArray(criteria.status) ? criteria.status : [criteria.status];
        results = results.filter(p => statusArray.includes(p.status));
    }
    
    return results;
}

function showSearchSummary(criteria, resultCount) {
    const summary = Object.entries(criteria)
        .map(([key, value]) => {
            const labels = {
                patent_number: '특허번호',
                title: '발명명칭',
                tech_field: '기술분야',
                inventor: '발명자',
                date_from: '시작일',
                date_to: '종료일',
                status: '상태'
            };
            
            const valueStr = Array.isArray(value) ? value.join(', ') : value;
            return `${labels[key]}: ${valueStr}`;
        })
        .join(' | ');
    
    console.log(`✅ 검색 완료: ${summary} - 결과: ${resultCount}개`);
}

// Global functions for patent search
window.GST.searchPatentNumber = function(patentNumber) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = patentNumber;
        if (window.AppState) {
            window.AppState.searchQuery = patentNumber;
        }
        if (typeof performSearch === 'function') {
            performSearch(patentNumber, new AbortController().signal);
        }
    }
};

// Initialize enhanced search when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize AI Chat Interface
    window.aiChatInterface = new AIChatInterface();
    
    console.log('🔍 Enhanced Search & RAG Integration Module initialized');
});

// Export for global access
window.toggleAIChat = function(show) {
    if (window.aiChatInterface) {
        window.aiChatInterface.toggleChat(show);
    }
};

window.showSearchSuggestions = showSearchSuggestions;
window.hideSearchSuggestions = hideSearchSuggestions;
window.selectSuggestion = selectSuggestion;
window.handleSearchKeydown = handleSearchKeydown;
window.showAdvancedSearch = showAdvancedSearch;
