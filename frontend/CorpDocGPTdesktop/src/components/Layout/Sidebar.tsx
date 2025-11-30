import React from 'react';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Chat as ChatIcon,
  Folder as DocumentsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ChevronLeft as CloseIcon,
} from '@mui/icons-material';
import { Logo } from '../Common/Logo';
import { ChatHistoryItem } from '../../types';

interface SidebarProps {
  currentPage: 'chat' | 'documents';
  onPageChange: (page: 'chat' | 'documents') => void;
  open: boolean;
  onToggle: () => void;
  currentChatId?: string;
  chatHistory: ChatHistoryItem[];
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  open,
  onToggle,
  currentChatId,
  chatHistory,
  onChatSelect,
  onNewChat,
  onDeleteChat,
}) => {
  const menuItems = [
    { key: 'documents' as const, label: 'База документов', icon: <DocumentsIcon /> },
  ];

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <Drawer
      variant="persistent"
      open={open}
      onClose={onToggle}
      sx={{
        '& .MuiDrawer-paper': {
          width: 320,
          boxSizing: 'border-box',
          border: 'none',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          backgroundColor: 'primary.main',
          color: 'white',
          transition: 'transform 225ms cubic-bezier(0.4, 0, 0.6, 1) 0ms',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 1200,
        },
      }}
      ModalProps={{
        keepMounted: true,
      }}
    >
      {/* Заголовок с логотипом и кнопкой закрытия */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Logo size="small" white={true} />
          <Typography variant="h6" fontWeight="bold" color="white">
            МТУСИ
          </Typography>
        </Box>

        {/* Кнопка закрытия сайдбара */}
        <Tooltip title="Скрыть боковую панель">
          <IconButton
            onClick={onToggle}
            sx={{
              color: 'white',
              backgroundColor: 'rgba(255,255,255,0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.2)',
              },
              transition: 'all 0.15s ease-in-out',
              width: 32,
              height: 32,
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />

      {/* Кнопка нового чата */}
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onNewChat}
          sx={{
            borderRadius: 2,
            py: 1,
            textTransform: 'none',
            fontWeight: 500,
            backgroundColor: 'white',
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'white',
            },
            '& .MuiSvgIcon-root': {
              color: 'primary.main',
            },
            transition: 'all 0.15s ease-in-out',
          }}
        >
          Новый чат
        </Button>
      </Box>

      {/* История чатов */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'rgba(255,255,255,0.8)' }}>
          История чатов ({chatHistory.length})
        </Typography>
        
        <List sx={{ px: 1 }}>
          {chatHistory.map((chat) => (
            <ListItemButton
              key={chat.id}
              selected={currentChatId === chat.id && currentPage === 'chat'}
              onClick={() => {
                onChatSelect(chat.id);
                onPageChange('chat');
              }}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: 'white',
                transition: 'all 0.15s ease-in-out',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '&.Mui-selected': {
                    backgroundColor: 'white',
                    color: 'primary.main',
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    },
                    '& .MuiListItemText-secondary': {
                      color: 'rgba(0,0,0,0.7)',
                    },
                  },
                },
                '&.Mui-selected': {
                  backgroundColor: 'white',
                  color: 'primary.main',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main',
                  },
                  '& .MuiListItemText-secondary': {
                    color: 'rgba(0,0,0,0.7)',
                  },
                  '&:hover': {
                    backgroundColor: 'white',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                <ChatIcon fontSize="small" />
              </ListItemIcon>
              
              <ListItemText
                primary={
                  <Typography 
                    variant="body2" 
                    fontWeight="medium" 
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: 1.3,
                      maxWidth: '160px',
                    }}
                  >
                    {chat.title}
                  </Typography>
                }
                secondary={
                  <Typography 
                    variant="caption" 
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      maxWidth: '160px',
                      color: 'inherit',
                      opacity: 0.8,
                    }}
                  >
                    {chat.lastMessage}
                  </Typography>
                }
                sx={{ 
                  mr: 1,
                  minWidth: 0,
                }}
              />
              
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'flex-end', 
                minWidth: 50,
                flexShrink: 0,
              }}>
                <Typography variant="caption" sx={{ opacity: 0.7, mb: 0.5, fontSize: '0.7rem' }}>
                  {formatTime(chat.timestamp)}
                </Typography>
                <Tooltip title="Удалить чат">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    sx={{ 
                      opacity: 0.5,
                      color: 'inherit',
                      padding: '4px',
                      '&:hover': { 
                        opacity: 1,
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
                      transition: 'all 0.15s ease-in-out',
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </ListItemButton>
          ))}
        </List>
      </Box>

      {/* Меню навигации */}
      <Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
        
        <List sx={{ py: 0 }}>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.key}
              selected={currentPage === item.key}
              onClick={() => onPageChange(item.key)}
              sx={{
                borderRadius: 0,
                color: 'white',
                transition: 'all 0.15s ease-in-out',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '&.Mui-selected': {
                    backgroundColor: 'white',
                    color: 'primary.main',
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    },
                  },
                },
                '&.Mui-selected': {
                  backgroundColor: 'white',
                  color: 'primary.main',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main',
                  },
                  '&:hover': {
                    backgroundColor: 'white',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontSize: '0.9rem'
                  }
                }}
              />
            </ListItemButton>
          ))}
        </List>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
        
        <Box sx={{ p: 2 }}>
          <Typography variant="caption" display="block" fontSize="0.7rem" color="rgba(255,255,255,0.8)">
            Васюкова Наталья, БВТ2303
          </Typography>
          <Typography variant="caption" display="block" fontSize="0.7rem" color="rgba(255,255,255,0.8)">
            Ситникова Дарья, БВТ2303
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};