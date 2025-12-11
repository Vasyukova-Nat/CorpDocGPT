import React, { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  LinearProgress,
  Alert,
  useTheme,
  Chip,
  Stack,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';

interface UploadResult {
  file: File;
  success: boolean;
  result?: any;
  error?: any;
}

export const UploadArea: React.FC = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]): Promise<UploadResult[]> => {
      const results: UploadResult[] = [];
      
      for (const file of files) {
        try {
          const result = await apiService.uploadDocument(file);
          results.push({ file, success: true, result });
        } catch (error) {
          results.push({ file, success: false, error });
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      setUploadResults(results);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      
      // Очищаем выбранные файлы после успешной загрузки
      const allSuccessful = results.every(result => result.success);
      if (allSuccessful) {
        setSelectedFiles([]);
      }
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    e.target.value = '';
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return ['pdf', 'docx', 'txt'].includes(extension || '');
    });
    
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setUploadResults([]); // Сбрасываем предыдущие результаты
    }
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      uploadMutation.mutate(selectedFiles);
    }
  };

  const removeFile = (fileName: string) => {
    setSelectedFiles(prev => prev.filter(file => file.name !== fileName));
    setUploadResults(prev => prev.filter(result => result.file.name !== fileName));
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setUploadResults([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSuccessCount = () => uploadResults.filter(result => result.success).length;
  const getErrorCount = () => uploadResults.filter(result => !result.success).length;

  return (
    <Paper
      elevation={2}
      sx={{
        p: 4,
        border: '2px dashed',
        borderColor: isDragOver ? 'primary.main' : 'divider',
        backgroundColor: isDragOver ? 'action.hover' : 'background.paper',
        transition: 'none',
        textAlign: 'center',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <UploadIcon
        sx={{
          fontSize: 48,
          color: isDarkMode ? 'white' : 'primary.main',
          mb: 2,
          opacity: uploadMutation.isPending ? 0.5 : 1,
        }}
      />
      
      <Typography variant="h6" gutterBottom sx={{ color: isDarkMode ? 'white' : 'inherit' }}>
        {uploadMutation.isPending ? 'Загрузка документов...' : 'Перетащите документы сюда'}
      </Typography>
      
      <Typography variant="body2" sx={{ mb: 3, color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
        Поддерживаются PDF, DOCX, TXT файлы. Можно выбрать несколько файлов
      </Typography>

      {/* Список выбранных файлов */}
      {selectedFiles.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: isDarkMode ? 'white' : 'inherit' }}>
              Выбрано файлов: {selectedFiles.length}
            </Typography>
            <Button 
              size="small" 
              onClick={clearAll}
              disabled={uploadMutation.isPending}
              sx={{
                color: isDarkMode ? 'white' : 'primary.main',
                border: isDarkMode ? '1px solid rgba(255,255,255,0.5)' : '1px solid',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.5)' : 'primary.main',
                '&:hover': {
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(25, 118, 210, 0.04)',
                  borderColor: isDarkMode ? 'white' : 'primary.dark',
                },
              }}
            >
              Очистить все
            </Button>
          </Box>
          <Stack spacing={1} sx={{ maxHeight: 200, overflow: 'auto' }}>
            {selectedFiles.map((file, index) => {
              const result = uploadResults.find(r => r.file.name === file.name);
              return (
                <Chip
                  key={index}
                  label={`${file.name} (${formatFileSize(file.size)})`}
                  onDelete={uploadMutation.isPending ? undefined : () => removeFile(file.name)}
                  deleteIcon={<CloseIcon />}
                  variant="outlined"
                  color={result ? (result.success ? 'success' : 'error') : 'default'}
                  sx={{
                    justifyContent: 'space-between',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.3)' : 'divider',
                    color: isDarkMode ? 'white' : 'inherit',
                  }}
                />
              );
            })}
          </Stack>
        </Box>
      )}

      {!uploadMutation.isPending ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            component="label"
            startIcon={<UploadIcon />}
            sx={{
              backgroundColor: isDarkMode ? 'white' : 'primary.main',
              color: isDarkMode ? 'primary.main' : 'white',
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.9)' : 'primary.dark',
              },
            }}
          >
            Выбрать файлы
            <input
              type="file"
              hidden
              multiple
              accept=".pdf,.docx,.txt"
              onChange={handleFileSelect}
            />
          </Button>
          
          {selectedFiles.length > 0 && (
            <Button
              variant="outlined"
              onClick={handleUpload}
              disabled={selectedFiles.length === 0}
              sx={{
                color: isDarkMode ? 'white' : 'primary.main',
                borderColor: isDarkMode ? 'white' : 'primary.main',
                '&:hover': {
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(25, 118, 210, 0.04)',
                  borderColor: isDarkMode ? 'white' : 'primary.dark',
                },
              }}
            >
              Загрузить все файлы ({selectedFiles.length})
            </Button>
          )}
        </Box>
      ) : (
        <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}>
          <LinearProgress sx={{ height: 8, borderRadius: 4, mb: 2 }} />
          <Typography variant="body2" sx={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
            Загрузка {selectedFiles.length} файлов...
          </Typography>
        </Box>
      )}

      {/* Результаты загрузки */}
      {uploadResults.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {getSuccessCount() > 0 && (
            <Alert 
              icon={<CheckIcon fontSize="inherit" />} 
              severity="success"
              sx={{ mb: 1 }}
            >
              Успешно загружено: {getSuccessCount()} файлов
            </Alert>
          )}
          
          {getErrorCount() > 0 && (
            <Alert 
              icon={<ErrorIcon fontSize="inherit" />} 
              severity="error"
            >
              Ошибка при загрузке: {getErrorCount()} файлов
            </Alert>
          )}

          {/* Детальная информация об ошибках */}
          {getErrorCount() > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mb: 1 }}>
                Файлы с ошибками:
              </Typography>
              <Stack spacing={0.5}>
                {uploadResults
                  .filter(result => !result.success)
                  .map((result, index) => (
                    <Typography key={index} variant="caption" sx={{ color: 'error.main', display: 'block' }}>
                      • {result.file.name}
                    </Typography>
                  ))
                }
              </Stack>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};