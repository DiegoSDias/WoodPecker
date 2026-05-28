# Woodpecker 🧮

O **Woodpecker** é uma aplicação web moderna inspirada no clássico sistema TORA, desenvolvida para modelagem e resolução de problemas de Pesquisa Operacional, com foco inicial em Programação Linear.

---

# 🏗️ Arquitetura e Padrões

Este projeto utiliza o ecossistema moderno do **Laravel 12** integrado ao **React**, abandonando a necessidade de construir APIs REST isoladas graças ao uso do **Inertia.js**. Isso cria uma experiência de Single Page Application (SPA) com a solidez de um backend MVC tradicional.

## Estrutura de Domínio (Backend - Laravel MVC)

A lógica de dados foi estruturada para entregar máxima performance aos algoritmos matemáticos (como o Simplex):

- **Modelagem Híbrida Vetorial:** Em vez de super-normalizar variáveis estruturais (`x_i`), o banco utiliza colunas `JSON` convertidas automaticamente via `$casts` do Eloquent. Isso entrega vetores e matrizes prontas para a montagem do *Tableau* algébrico.

- **Enums Nativos:** Uso de Backed Enums (`ConstraintOperator`, `OptimizationType`) para garantir integridade referencial estrita e padronização entre o banco de dados e as validações de request.

- **Soft Deletes & Cascade:** Estrutura relacional protegida contra dados órfãos, permitindo a exclusão segura de projetos e históricos de solução.

## Estrutura Visual (Frontend - React + Inertia)

- **Componentização:** Telas construídas com React 19, utilizando Tailwind CSS para uma interface limpa e responsiva.

- **Autenticação Headless:** Integrado via Laravel Breeze, fornecendo fluxos completos de login e registro diretamente acoplados ao frontend React.

---

# 🚀 Stack Tecnológica

- **Backend:** PHP 8.2+, Laravel 12
- **Frontend:** React 19, Inertia.js, Tailwind CSS
- **Banco de Dados:** MySQL (estrutura relacional com suporte a JSON nativo)
- **Testes:** Pest PHP (testes funcionais e unitários)
- **Gerenciador de Pacotes:** Composer (PHP) e npm (Node.js)

---

# 📂 Arquitetura de Diretórios

A estrutura segue o padrão Laravel, com o frontend perfeitamente acoplado na pasta `resources`:

```text
vector-otimizador/
├── app/                        # 🧠 BACKEND: Lógica de Negócio e Controladores
│   ├── Enums/                  # Classes de tipagem forte (ex: ConstraintOperator.php)
│   ├── Http/
│   │   └── Controllers/        # Recebem a requisição e retornam as Views via Inertia
│   └── Models/                 # Representação das tabelas (Project, Constraint, etc.)
│
├── database/                   # 💾 BANCO DE DADOS: Estrutura e Dados Fictícios
│   ├── migrations/             # Histórico de criação e alteração das tabelas MySQL
│   └── seeders/                # Scripts para popular o banco com dados de teste
│
├── resources/                  # 🎨 FRONTEND: Toda a interface do usuário (React)
│   ├── css/
│   │   └── app.css             # Configurações globais do Tailwind CSS
│   └── js/
│       ├── Components/         # Botões, Inputs, Modais (Reutilizáveis)
│       ├── Layouts/            # Estrutura base das páginas (Header, Sidebar)
│       ├── Pages/              # As telas finais da aplicação injetadas pelo Inertia
│       └── app.tsx             # Arquivo principal que inicializa o React
│
├── routes/                     # 🛣️ ROTAS: Mapa de navegação
│   └── web.php                 # Definição das URLs do sistema
│
├── .env                        # ⚙️ CONFIGURAÇÕES: Credenciais (MySQL, etc.)
└── vite.config.js              # Empacotador moderno que compila o React/Tailwind
```

---

# 🗄️ Modelagem do Banco de Dados

O banco de dados foi desenhado para equilibrar integridade relacional e eficiência algorítmica.

O modelo visual pode ser gerado copiando o código DBML abaixo e colando no [dbdiagram.io](https://dbdiagram.io/):

```dbml
Table users {
  id integer [primary key, increment]
  name varchar [not null]
  email varchar [unique, not null]
  password varchar [not null]
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

Table projects {
  id integer [primary key, increment]
  user_id integer [not null]
  title varchar [not null]
  description text
  num_variables integer [not null]
  num_constraints integer [not null]
  optimization_type enum('max', 'min') [not null]
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

Table objective_functions {
  id integer [primary key, increment]
  project_id integer [unique, not null]
  coefficients json [not null, note: 'Ex: [3, 5, 2]']
  created_at timestamp
  updated_at timestamp
}

Table constraints {
  id integer [primary key, increment]
  project_id integer [not null]
  coefficients json [not null, note: 'Ex: [1, 0, 2]']
  operator enum('<=', '>=', '=') [not null]
  rhs_value decimal(15,6) [not null]
  created_at timestamp
  updated_at timestamp
}

Table solutions {
  id integer [primary key, increment]
  project_id integer [not null]
  method_used varchar [not null]
  z_value decimal(15,6) [not null]
  variables_result json [not null, note: 'Ex: {"x1": 2.5, "x2": 0}']
  created_at timestamp
  updated_at timestamp
}

Ref: projects.user_id > users.id [delete: cascade]
Ref: objective_functions.project_id - projects.id [delete: cascade]
Ref: constraints.project_id > projects.id [delete: cascade]
Ref: solutions.project_id > projects.id [delete: cascade]
```

---

# 🛠️ Configuração e Execução do Ambiente

Siga os passos abaixo para rodar o projeto localmente:

## 1️⃣ Clone o repositório

```bash
git clone https://github.com/seu-usuario/seu-repositorio.git
cd seu-repositorio
```

## 2️⃣ Instale as dependências do Backend (PHP)

```bash
composer install
```

## 3️⃣ Instale as dependências do Frontend (Node)

```bash
npm install
```

## 4️⃣ Configure as Variáveis de Ambiente

Copie o arquivo de exemplo e configure suas credenciais do MySQL:

```bash
cp .env.example .env
php artisan key:generate
```

## 5️⃣ Execute as Migrações do Banco de Dados

Certifique-se de que o seu banco MySQL esteja rodando:

```bash
php artisan migrate
```

## 6️⃣ Inicie os Servidores de Desenvolvimento

Você precisará de dois terminais abertos.

### Terminal 1 — Servidor PHP

```bash
php artisan serve
```

### Terminal 2 — Compilador Vite

```bash
npm run dev
```

---

# 🌐 Acesso

Abra o navegador e acesse:

```text
http://localhost:8000
```

---

# 📚 Funcionalidades (Roadmap)

- [x] Autenticação: Sistema de login, registro e gestão de sessão via Laravel Breeze.

- [x] Modelagem de Dados: Estrutura otimizada em JSON para recebimento de variáveis, funções objetivo e restrições.

- [ ] Interface de Criação: Formulários dinâmicos para definir quantidade de restrições e variáveis.

- [ ] Motor Matemático: Implementação do Algoritmo Simplex (Maximização e Minimização).

- [ ] Métodos Alternativos: Resolução por Simplex Dual, Método Gráfico (2 variáveis) e Algébrico.

- [ ] Histórico de Soluções: Salvamento e visualização de resoluções passadas no painel do usuário.

---

# 📌 Objetivo do Projeto

O objetivo deste sistema é oferecer uma plataforma moderna, acadêmica e profissional para modelagem e resolução de problemas de Pesquisa Operacional, servindo tanto para estudos quanto para aplicações reais em otimização matemática.

O projeto foi arquitetado para ser escalável, permitindo a futura implementação de novos métodos matemáticos, visualizações gráficas e recursos colaborativos.

---

# 👨‍💻 Autor

Desenvolvido por **Diego Santos Dias**

- [GitHub](https://github.com/DiegoSDias)
- [LinkedIn](https://www.linkedin.com/in/diego-dias-8992422b5/)
