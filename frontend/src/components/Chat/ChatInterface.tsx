import React, { useState, useRef, useEffect } from 'react';
import { Box, Container, Fade, Alert, Typography } from '@mui/material';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { Logo } from '../Common/Logo';
import { ChatMessage } from '../../types';
import { apiService } from '../../services/api';
import { AutoAwesome as AutoAwesomeIcon, Description as DocumentIcon } from '@mui/icons-material';

interface ChatInterfaceProps {
  chatId?: string;
  messages: ChatMessage[];
  onNewMessage: (message: ChatMessage, isUser: boolean) => void;
  onUpdateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({  
  messages, 
  onNewMessage,
  onUpdateMessage 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatType, setChatType] = useState<'rag_only' | 'general'>('rag_only');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const simulateStreaming = async (fullText: string, messageId: string, delay: number = 30) => {
    let currentContent = '';
    
    for (let i = 0; i < fullText.length; i++) {
      currentContent += fullText[i];
      onUpdateMessage(messageId, {
        content: currentContent,
        isStreaming: true,
        status: 'streaming',
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Завершаем streaming
    onUpdateMessage(messageId, {
      content: fullText,
      isStreaming: false,
      status: 'completed',
    });
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    onNewMessage(userMessage, true);
    setIsLoading(true);
    setError(null);

    const assistantMessageId = (Date.now() + 1).toString();
    const tempAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: false,
      status: 'thinking',
    };
  
    onNewMessage(tempAssistantMessage, false);

    let currentContent = '';

    try {
      if (chatType === 'rag_only') {
        // Используем RAG streaming
        await apiService.queryDocumentsStream(content, (chunk) => {
          switch (chunk.type) {
            case 'sources':
              onUpdateMessage(assistantMessageId, {
                sources: chunk.sources,
              });
              break;

            case 'content':
              if (chunk.content) {
                currentContent += chunk.content;
              
                if (currentContent === chunk.content) {
                  onUpdateMessage(assistantMessageId, {
                    content: currentContent,
                    isStreaming: !chunk.done,
                    status: 'streaming',
                    timestamp: new Date().toISOString(),
                  });
                } else {
                  onUpdateMessage(assistantMessageId, {
                    content: currentContent,
                    isStreaming: !chunk.done,
                    status: chunk.done ? 'completed' : 'streaming',
                  });
                }
              }
           
              if (chunk.done) {
                onUpdateMessage(assistantMessageId, {
                  content: currentContent,
                  isStreaming: false,
                  status: 'completed',
                });
              }
              break;

            case 'error':
              setError(chunk.content);
              onUpdateMessage(assistantMessageId, {
                content: `Ошибка: ${chunk.content}`,
                isStreaming: false,
                status: 'completed',
              });
              break;
          }
        });
      } else {
        const response = await apiService.chat(content);
        
        onUpdateMessage(assistantMessageId, {
          content: '',
          isStreaming: true,
          status: 'streaming',
          sources: response.sources || [],
        });

        await simulateStreaming(response.answer, assistantMessageId, 20);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setError('Ошибка при отправке сообщения');
      
      onUpdateMessage(assistantMessageId, {
        content: 'Извините, произошла ошибка. Пожалуйста, попробуйте еще раз.',
        isStreaming: false,
        status: 'completed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {error && (
        <Alert severity="error" sx={{ m: 2, mb: 0 }}>
          {error}
        </Alert>
      )}
      
      {/* Белая линия поверх чата */}
      <Box sx={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        backgroundColor: 'divider',
        zIndex: 5
      }} />
      
      {/* Красивый переключатель типа чата с подложкой */}
      <Box sx={{ 
        position: 'absolute',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10
      }}>
        <Box sx={{
          display: 'flex',
          backgroundColor: 'background.paper',
          borderRadius: '24px',
          padding: '3px',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          position: 'relative',
          minWidth: '200px'
        }}>
          {/* Активный индикатор с анимацией */}
          <Box sx={{
            position: 'absolute',
            top: '3px',
            left: chatType === 'rag_only' ? '3px' : 'calc(50% + 3px)',
            width: 'calc(50% - 6px)',
            height: 'calc(100% - 6px)',
            backgroundColor: 'primary.main',
            borderRadius: '21px',
            transition: 'left 0.3s ease',
            zIndex: 1
          }} />
          
          {/* Кнопка "Только документы" */}
          <Box
            onClick={() => setChatType('rag_only')}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 10px',
              borderRadius: '21px',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 2,
              transition: 'color 0.3s ease',
              color: chatType === 'rag_only' ? 'white' : 'text.secondary',
              fontWeight: 500,
              fontSize: '0.75rem',
              minHeight: '28px',
              border: 'none',
              outline: 'none',
              '&:focus': {
                outline: 'none',
                border: 'none'
              }
            }}
          >
            <DocumentIcon sx={{ fontSize: 16, mr: 0.5 }} />
            Только документы
          </Box>
          
          {/* Кнопка "Умный ассистент" */}
          <Box
            onClick={() => setChatType('general')}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 10px',
              borderRadius: '21px',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 2,
              transition: 'color 0.3s ease',
              color: chatType === 'general' ? 'white' : 'text.secondary',
              fontWeight: 500,
              fontSize: '0.75rem',
              minHeight: '28px',
              border: 'none',
              outline: 'none',
              '&:focus': {
                outline: 'none',
                border: 'none'
              }
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 16, mr: 0.5 }} />
            Умный ассистент
          </Box>
        </Box>
      </Box>
      
      {messages.length <= 1 ? (
        <Fade in={true} timeout={500}>
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            px: 2,
            pt: 6
          }}>
            <Logo size="large" forceWhite={true} />

            <Box sx={{ mt: 4, width: '100%', maxWidth: 800 }}>
              <ChatInput 
                onSendMessage={handleSendMessage}
                placeholder={
                  chatType === 'rag_only' 
                    ? "Задайте вопрос о документах университета, учебном процессе или регламентах..."
                    : "Задайте любой вопрос, ассистент поможет вам..."
                }
                disabled={false}
              />
              
              {/* Подсказка под строкой ввода */}
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'block', 
                  textAlign: 'center', 
                  mt: 2,
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  lineHeight: 1.4,
                }}
              >
                {chatType === 'rag_only' 
                  ? 'Ассистент отвечает только на основе загруженных документов' 
                  : 'Ассистент использует документы, когда это возможно, или общие знания'
                }
              </Typography>
            </Box>
          </Box>
        </Fade>
      ) : (
        <>
          <Box sx={{ flex: 1, overflow: 'auto', pt: 6 }}> {/* Отступ сверху для переключателя */}
            <Container maxWidth="lg" sx={{ py: 2 }}>
              <MessageList 
                messages={messages} 
                isLoading={isLoading}
              />
              <div ref={messagesEndRef} />
            </Container>
          </Box>
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Container maxWidth="lg">
              <ChatInput 
                onSendMessage={handleSendMessage}
                disabled={isLoading}
                placeholder={
                  chatType === 'rag_only' 
                    ? "Задайте следующий вопрос о документах..."
                    : "Задайте следующий вопрос..."
                }
              />
              
              {/* Подсказка под строкой ввода */}
              <Typography 
                variant="caption" 
                sx={{ 
                  display: 'block', 
                  textAlign: 'center', 
                  mt: 1,
                  color: 'text.secondary',
                  fontSize: '0.7rem',
                }}
              >
                {chatType === 'rag_only' 
                  ? 'Ассистент отвечает только на основе загруженных документов' 
                  : 'Ассистент использует документы, когда это возможно, или общие знания'
                }
              </Typography>
            </Container>
          </Box>
        </>
      )}
    </Box>
  );
};