#!/usr/bin/env python3
"""
OnSpace App - Локальный запуск
Скрипт для автоматического запуска React Native приложения
"""

import os
import sys
import subprocess
import platform
import json
from pathlib import Path

class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(60)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

def print_success(text):
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")

def print_info(text):
    print(f"{Colors.OKCYAN}ℹ {text}{Colors.ENDC}")

def print_warning(text):
    print(f"{Colors.WARNING}⚠ {text}{Colors.ENDC}")

def check_node():
    """Проверка установки Node.js"""
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True, check=False)
        version = (result.stdout or result.stderr).strip()
        if result.returncode == 0 and version:
            print_success(f"Node.js установлен: {version}")
            return True
        raise FileNotFoundError
    except FileNotFoundError:
        print_error("Node.js не установлен или недоступен в PATH!")
        print_info("Установите Node.js с https://nodejs.org/ и откройте новый терминал")
        return False

def check_package_manager():
    """Проверка установки пакетного менеджера"""
    # Проверяем pnpm
    try:
        result = subprocess.run(['pnpm', '--version'], capture_output=True, text=True, check=False)
        version = (result.stdout or result.stderr).strip()
        if result.returncode == 0 and version:
            print_success(f"pnpm установлен: {version}")
            return 'pnpm'
    except FileNotFoundError:
        pass
    
    # Проверяем npm
    try:
        result = subprocess.run(['npm', '--version'], capture_output=True, text=True, check=False)
        version = (result.stdout or result.stderr).strip()
        if result.returncode == 0 and version:
            print_success(f"npm установлен: {version}")
            print_info("Используем npm (pnpm не найден)")
            return 'npm'
    except FileNotFoundError:
        pass
    
    print_error("Ни pnpm, ни npm не установлены!")
    return None

def install_dependencies(pm):
    """Установка зависимостей проекта"""
    print_info("Проверка зависимостей...")
    
    if not Path('node_modules').exists():
        print_info("Устанавливаю зависимости (это может занять несколько минут)...")
        try:
            if pm == 'pnpm':
                cmd = [pm, 'install']
            else:
                cmd = [pm, 'install', '--legacy-peer-deps']
            subprocess.run(cmd, check=True)
            print_success("Зависимости установлены")
        except subprocess.CalledProcessError:
            print_error("Ошибка при установке зависимостей")
            return False
    else:
        print_success("Зависимости уже установлены")
    
    return True

def show_menu():
    """Показать меню выбора платформы"""
    print_header("OnSpace App - Локальный запуск")
    print(f"{Colors.BOLD}Выберите платформу для запуска:{Colors.ENDC}\n")
    print(f"  {Colors.OKCYAN}1{Colors.ENDC} - Web (браузер)")
    print(f"  {Colors.OKCYAN}2{Colors.ENDC} - Android")
    print(f"  {Colors.OKCYAN}3{Colors.ENDC} - iOS (только на macOS)")
    print(f"  {Colors.OKCYAN}4{Colors.ENDC} - Expo Dev Client (QR код)")
    print(f"  {Colors.OKCYAN}5{Colors.ENDC} - Очистить кэш и перезапустить")
    print(f"  {Colors.OKCYAN}0{Colors.ENDC} - Выход\n")

def clear_cache():
    """Очистка кэша проекта"""
    print_info("Очистка кэша...")
    
    cache_dirs = [
        'node_modules/.cache',
        '.expo',
        'dist',
        'web-build'
    ]
    
    for cache_dir in cache_dirs:
        if Path(cache_dir).exists():
            try:
                if platform.system() == 'Windows':
                    subprocess.run(f'rmdir /s /q "{cache_dir}"', shell=True)
                else:
                    subprocess.run(['rm', '-rf', cache_dir])
                print_success(f"Удалено: {cache_dir}")
            except:
                print_warning(f"Не удалось удалить: {cache_dir}")
    
    print_success("Кэш очищен")

def run_web(pm):
    """Запуск веб-версии"""
    print_header("Запуск Web версии")
    print_info("Приложение откроется в браузере...")
    print_info("Для остановки нажмите Ctrl+C\n")
    
    try:
        subprocess.run([pm, 'run', 'web'])
    except KeyboardInterrupt:
        print_info("\nПриложение остановлено")

def run_android(pm):
    """Запуск Android версии"""
    print_header("Запуск Android версии")
    print_info("Убедитесь, что Android эмулятор запущен или устройство подключено")
    print_info("Для остановки нажмите Ctrl+C\n")
    
    try:
        subprocess.run([pm, 'run', 'android'])
    except KeyboardInterrupt:
        print_info("\nПриложение остановлено")

def run_ios(pm):
    """Запуск iOS версии"""
    if platform.system() != 'Darwin':
        print_error("iOS можно запустить только на macOS")
        return
    
    print_header("Запуск iOS версии")
    print_info("Убедитесь, что iOS симулятор установлен")
    print_info("Для остановки нажмите Ctrl+C\n")
    
    try:
        subprocess.run([pm, 'run', 'ios'])
    except KeyboardInterrupt:
        print_info("\nПриложение остановлено")

def run_expo(pm):
    """Запуск Expo Dev Client"""
    print_header("Запуск Expo Dev Client")
    print_info("Отсканируйте QR код в приложении Expo Go")
    print_info("Для остановки нажмите Ctrl+C\n")
    
    try:
        subprocess.run([pm, 'start'])
    except KeyboardInterrupt:
        print_info("\nПриложение остановлено")

def main():
    """Главная функция"""
    # Проверка окружения
    print_header("Проверка окружения")
    
    if not check_node():
        sys.exit(1)
    
    pm = check_package_manager()
    if not pm:
        print_error("Установите npm или pnpm для продолжения")
        sys.exit(1)
    
    if not install_dependencies(pm):
        sys.exit(1)
    
    # Главный цикл
    while True:
        show_menu()
        
        try:
            choice = input(f"{Colors.BOLD}Ваш выбор: {Colors.ENDC}").strip()
        except KeyboardInterrupt:
            print_info("\n\nВыход...")
            sys.exit(0)
        
        if choice == '0':
            print_info("Выход...")
            break
        elif choice == '1':
            run_web(pm)
        elif choice == '2':
            run_android(pm)
        elif choice == '3':
            run_ios(pm)
        elif choice == '4':
            run_expo(pm)
        elif choice == '5':
            clear_cache()
            if not install_dependencies(pm):
                sys.exit(1)
        else:
            print_error("Неверный выбор. Попробуйте снова.")
        
        input(f"\n{Colors.BOLD}Нажмите Enter для продолжения...{Colors.ENDC}")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print_info("\n\nВыход...")
        sys.exit(0)
