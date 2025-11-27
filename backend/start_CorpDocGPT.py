import os
import subprocess
import time
import threading
import requests

def check_ollama_installed():
    try:
        result = subprocess.run(["ollama", "--version"], 
                              capture_output=True, text=True)
        return result.returncode == 0
    except FileNotFoundError:
        return False

def check_ollama_running():
    try:
        result = subprocess.run(["ollama", "list"], 
                              capture_output=True, text=True)
        return result.returncode == 0
    except FileNotFoundError:
        return False

def check_model_installed():
    try:
        result = subprocess.run(["ollama", "list"], 
                              capture_output=True, text=True)
        return "qwen2.5:0.5b" in result.stdout
    except FileNotFoundError:
        return False

def wait_for_backend(timeout=120):    
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get("http://localhost:8000/health", timeout=5)
            if response.status_code == 200:
                print("✅ Бэкенд запущен!")
                return True
        except requests.exceptions.RequestException:
            pass
        
        # Прогресс-бар
        elapsed = time.time() - start_time
        progress = min(elapsed / timeout * 100, 100)
        print(f"Загрузка бэкенда... {progress:.1f}%", end='\r')
        time.sleep(2)
    
    print(f"\n❌ Бэкенд не запустился за {timeout} секунд")
    return False

def install_ollama():
    print("Установка Ollama...")
    if os.path.exists("OllamaSetup.exe"):
        subprocess.run(["OllamaSetup.exe"], check=True)
        print("✅ Ollama установлен")
    else:
        print("❌ Файл OllamaSetup.exe не найден")
        print("Скачайте Ollama с https://ollama.ai/download")
        input("Нажмите Enter после установки Ollama...")

def pull_model():
    print("Скачивание модели qwen2.5:0.5b...")
    try:
        subprocess.run(["ollama", "pull", "qwen2.5:0.5b"], check=True)
        print("✅ Модель установлена")
    except subprocess.CalledProcessError:
        print("❌ Ошибка скачивания модели")

def start_backend():
    if os.path.exists("backend.exe"):
        process = subprocess.Popen(["backend.exe"], # Запускаем бэкенд в отдельном процессе 
                                  stdout=subprocess.PIPE, 
                                  stderr=subprocess.STDOUT,  # Объединяем stdout и stderr
                                  text=True,
                                  bufsize=1,
                                  universal_newlines=True)
        
        def log_reader(pipe): # Запускаем мониторинг логов в отдельном потоке
            for line in pipe:
                if any(keyword in line for keyword in ["ERROR", "WARNING", "Started server", "Uvicorn running"]):
                    print(f"   [Бэкенд] {line.strip()}") # Фильтруем только важные логи
        
        threading.Thread(target=log_reader, args=(process.stdout,), daemon=True).start()
        
        return process
    else:
        print("❌ Файл backend.exe не найден")
        return None

def start_frontend():
    print("Запуск интерфейса...")
    if os.path.exists("frontend.exe"):
        subprocess.Popen(["frontend.exe"])
        print("✅ Интерфейс запущен!")
    else:
        print("❌ Файл frontend.exe не найден")

def main():
    print("=" * 50)
    print("Запуск МТУСИ AI Ассистента")
    print("=" * 50)
    
    if not check_ollama_installed():
        print("❌ Ollama не установлен")
        install_ollama()
    
    if not check_ollama_running():
        print("Запуск Ollama сервера...")
        subprocess.Popen(["ollama", "serve"])
        time.sleep(5)
    
    if not check_model_installed():
        print("❌ Модель qwen2.5:0.5b не установлена")
        pull_model()
    
    backend_process = start_backend()
    if not backend_process:
        return
    
    if not wait_for_backend():
        print("❌ Не удалось запустить бэкенд")
        input("Нажмите Enter для выхода...")
        return
    
    start_frontend()
    
    print("=" * 50)
    print("✅ Все компоненты запущены!")
    print("Интерфейс открывается (в отдельном окне)...")
    print("Документация бэкенда: http://localhost:8000/docs")
    print("Закройте это окно и интерфейс приложения для остановки всех процессов")
    print("=" * 50)
    
    try:
        backend_process.wait() # Ждем завершения бэкенда
    except KeyboardInterrupt:
        print("\n🛑 Остановка приложения...")

if __name__ == "__main__":
    main()