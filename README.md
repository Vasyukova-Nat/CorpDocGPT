# CorpDocGPT (Corporate document GPT)
Корпоративный локальный ИИ-ассистент для работы с документами.

## Описание
Desktop-приложение с локальной языковой моделью для анализа внутренних документов и консультаций по бизнес-процессам компании. Гарантирует полную конфиденциальность данных.
- [Презентация с изображениями CorpDocGPT](https://docs.google.com/presentation/d/1hhvXew3PiOmJAOcfRNkn3G0QS-vXuB7Nvo74SzDmbyE/)

## Стек
- Backend: Python, FastAPI
- Frontend: React, TypeScript, Tauri, Material-UI
- LLM/RAG: Ollama, LlamaIndex, ChromaDB, Sentence Transformers

## Функционал системы
- Загрузка документов для формирования базы знаний компании
- Создание и удаление чатов с ИИ-ассистентом
- Два режима работы: «Только по документам» или «Расширенный» (с общими знаниями ИИ)
- Суммаризация и анализ документов
- Консультация по бизнес-процессам на основе локальной базы знаний
- Вывод источников, на которые опиралась нейросеть при ответе
- Выбор темы интерфейса
- Полностью локальное развертывание

## Быстрый старт (режим разработки)
Запуск в 2 терминалах.
1) Backend (терминал 1) из папки backend:
```
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000 
```
2) Frontend (терминал №2) из папки frontend:  
Для Tauri нужна установка Rust, Cargo.  
```
npm install       
npm run tauri dev
```
Станут доступны: Tauri приложение, веб-приложение (http://localhost:1420/), Swagger (http://localhost:8000/docs). 

## Структура проекта
```
corporate-ai-assistant/
├── backend/
│ ├── rag_system/ # RAG
│ │ ├── components/
│ │ ├── rag_service.py # Главный сервис RAG
│ │ ├── simple_ingest_component.py # Индексация документов в ChromaDB
│ │ ├── simple_ingest_helper.py # Чтение PDF
│ │ └── paths.py # Пути к данным
│ ├── app.py
│ ├── requirements.txt
│ └── config.py
│
├── frontend/
│ ├── src/
│ │ ├── components/
│ │ │ ├── Chat/ # Чат
│ │ │ │ ├── ChatInput.tsx # Поле ввода
│ │ │ │ ├── ChatInterface.tsx # Интерфейс чата
│ │ │ │ ├── MessageBubble.tsx # Сообщение
│ │ │ │ └── MessageList.tsx
│ │ │ ├── Documents/ # Управление документами
│ │ │ │ ├── DocumentList.tsx # Список документов
│ │ │ │ ├── DocumentsPage.tsx # Страница документов
│ │ │ │ └── UploadArea.tsx # Загрузка файлов
│ │ │ ├── Layout/
│ │ │ │ ├── Header.tsx
│ │ │ │ ├── Sidebar.tsx
│ │ │ │ └── ThemeToggle.tsx # Светлая/темная тема
│ │ │ └── Common/ # Общие компоненты
│ │ ├── services/
│ │ │ └── api.ts # HTTP клиент для бэкенда
│ │ ├── hooks/
│ │ │ └── useTheme.ts # Хук для темы
│ │ ├── themes/ # Темы оформления
│ │ ├── types/ # TypeScript типы
│ │ ├── App.tsx
│ │ └── main.tsx
│ │
│ ├── src-tauri/ # Tauri Desktop
│ │ ├── src/
│ │ │ ├── main.rs # Rust entry point
│ │ │ └── lib.rs
│ │ ├── capabilities/ # Разрешения Tauri
│ │ ├── icons/ # Иконки приложения
│ │ ├── Cargo.toml
│ │ └── tauri.conf.json
│ ├── package.json # npm зависимости
│ ├── vite.config.ts # Vite конфиг
│ ├── tsconfig.json # TypeScript конфиг
│ └── index.html
└── .gitignore
```

## Артефакты проекта
- [Project Kanban](https://github.com/users/Vasyukova-Nat/projects/3)
- [Project Wiki](https://github.com/Vasyukova-Nat/corporate-ai-assistant/wiki)
