import { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { ChatInterface } from './components/Chat/ChatInterface';
import { DocumentsPage } from './components/Documents/DocumentsPage';
import { useTheme } from './hooks/useTheme';
import { ChatHistoryItem, ChatMessage } from './types';

const CHAT_HISTORY_KEY = 'chatHistory';

function App() {
  const { theme, toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState<'chat' | 'documents'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        const historyWithDates = parsedHistory.map((chat: any) => ({
          ...chat,
          timestamp: new Date(chat.timestamp),
          messages: chat.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setChatHistory(historyWithDates);
        
        if (historyWithDates.length > 0) {
          setCurrentChatId(historyWithDates[0].id);
        } else {
          handleNewChat();
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        handleNewChat();
      }
    } else {
      handleNewChat();
    }
  }, []);

  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  const generateChatId = () => {
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleNewChat = () => {
    const newChatId = generateChatId();
    const newChat: ChatHistoryItem = {
      id: newChatId,
      title: 'Новый чат',
      lastMessage: 'Задайте ваш первый вопрос...',
      timestamp: new Date(),
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: 'Здравствуйте! Я ваш корпоративный ассистент МТУСИ. Задайте вопрос о документах университета или учебном процессе.',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    setChatHistory(prev => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    setCurrentPage('chat');
  };

  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const handleNewMessage = (message: ChatMessage, isUser: boolean = false) => {
    setChatHistory(prev => 
      prev.map(chat => {
        if (chat.id === currentChatId) {
          const updatedMessages = [...chat.messages, message];
          
          let updatedTitle = chat.title;
          if (isUser && chat.title === 'Новый чат') {
            updatedTitle = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
          }

          const lastMessage = isUser ? message.content : `Ассистент: ${message.content.slice(0, 50)}...`;

          return {
            ...chat,
            title: updatedTitle,
            lastMessage,
            timestamp: new Date(),
            messages: updatedMessages
          };
        }
        return chat;
      })
    );
  };

  const handleUpdateMessage = (messageId: string, updates: Partial<ChatMessage>) => {
    setChatHistory(prev => 
      prev.map(chat => {
        if (chat.id === currentChatId) {
          const updatedMessages = chat.messages.map(msg => 
            msg.id === messageId ? { ...msg, ...updates } : msg
          );
          
          const lastMessage = updatedMessages[updatedMessages.length - 1];
          const updatedLastMessage = lastMessage.role === 'assistant' 
            ? `Ассистент: ${lastMessage.content.slice(0, 50)}...`
            : lastMessage.content;

          return {
            ...chat,
            lastMessage: updatedLastMessage,
            messages: updatedMessages
          };
        }
        return chat;
      })
    );
  };

  const deleteChat = (chatId: string) => {
    setChatHistory(prev => {
      const filteredHistory = prev.filter(chat => chat.id !== chatId);
      
      if (chatId === currentChatId) {
        if (filteredHistory.length > 0) {
          setCurrentChatId(filteredHistory[0].id);
        } else {
          handleNewChat();
        }
      }
      
      return filteredHistory;
    });
  };

  const getCurrentChatMessages = () => {
    const currentChat = chatHistory.find(chat => chat.id === currentChatId);
    return currentChat ? currentChat.messages : [];
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar 
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          open={sidebarOpen}
          onToggle={toggleSidebar}
          currentChatId={currentChatId}
          chatHistory={chatHistory}
          onChatSelect={handleChatSelect}
          onNewChat={handleNewChat}
          onDeleteChat={deleteChat}
        />
        
        {/* Основной контент - хедер и чат/документы */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          minWidth: 0,
          transition: 'margin-left 225ms cubic-bezier(0.4, 0, 0.6, 1) 0ms',
          marginLeft: sidebarOpen ? '320px' : '0px',
          width: sidebarOpen ? 'calc(100% - 320px)' : '100%',
        }}>
          {/* Хедер всегда на своем месте */}
          <Header 
            onThemeToggle={toggleTheme}
            onMenuToggle={toggleSidebar}
            onNewChat={handleNewChat}
            sidebarOpen={sidebarOpen}
          />
          
          {/* Контент чата/документов */}
          <Box sx={{ 
            flex: 1, 
            overflow: 'auto',
            width: '100%',
          }}>
            {currentPage === 'chat' ? (
              <ChatInterface 
                chatId={currentChatId}
                messages={getCurrentChatMessages()}
                onNewMessage={handleNewMessage}
                onUpdateMessage={handleUpdateMessage}
              />
            ) : (
              <DocumentsPage />
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;