-- Script de criação das tabelas do Laboratório de IDOR / Quebra de Controle de Acesso
-- Todas as tabelas têm uma chave composta (sala, numero): "sala" isola o Lab 1 do Lab 2
-- (igual ao mural de XSS) e "numero" é o ID público e PREVISÍVEL usado nas URLs —
-- de propósito, para os alunos poderem manipulá-lo nos exercícios.

CREATE TABLE IF NOT EXISTS idor_perfis (
    sala VARCHAR(10) NOT NULL,
    numero INTEGER NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    telefone VARCHAR(30) NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    salario NUMERIC(10,2) NOT NULL,
    cpf VARCHAR(20) NOT NULL,
    bio TEXT NOT NULL,
    papel VARCHAR(10) NOT NULL DEFAULT 'aluno',
    token VARCHAR(30),
    PRIMARY KEY (sala, numero)
);

CREATE TABLE IF NOT EXISTS idor_comprovantes (
    sala VARCHAR(10) NOT NULL,
    numero INTEGER NOT NULL,
    perfil_numero INTEGER NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    descricao VARCHAR(200) NOT NULL,
    PRIMARY KEY (sala, numero)
);

CREATE TABLE IF NOT EXISTS idor_faturas (
    sala VARCHAR(10) NOT NULL,
    numero INTEGER NOT NULL,
    perfil_numero INTEGER NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    descricao VARCHAR(200) NOT NULL,
    PRIMARY KEY (sala, numero)
);

CREATE TABLE IF NOT EXISTS idor_pedidos (
    sala VARCHAR(10) NOT NULL,
    numero INTEGER NOT NULL,
    perfil_numero INTEGER NOT NULL,
    item VARCHAR(200) NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    PRIMARY KEY (sala, numero)
);

CREATE TABLE IF NOT EXISTS idor_chamados (
    sala VARCHAR(10) NOT NULL,
    numero INTEGER NOT NULL,
    perfil_numero INTEGER NOT NULL,
    assunto VARCHAR(200) NOT NULL,
    mensagem TEXT NOT NULL,
    PRIMARY KEY (sala, numero)
);

CREATE TABLE IF NOT EXISTS idor_mensagens (
    sala VARCHAR(10) NOT NULL,
    numero INTEGER NOT NULL,
    perfil_numero INTEGER NOT NULL,
    conteudo TEXT NOT NULL,
    PRIMARY KEY (sala, numero)
);

-- Registra, no servidor, quais dos 10 exercícios cada sala já concluiu — usado pelo
-- painel oculto do professor (/idor/painel-professor) para acompanhar o progresso da turma.
CREATE TABLE IF NOT EXISTS idor_progresso (
    sala VARCHAR(10) NOT NULL,
    teste_id VARCHAR(10) NOT NULL,
    concluido_em TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (sala, teste_id)
);

-- Seeds: os dados são DIFERENTES entre a sala 1 e a sala 2 de propósito (telefone, CPF,
-- token, descrições e códigos secretos), para que a resposta correta de um exercício
-- nunca seja a mesma nas duas salas — evita que um aluno só peça a resposta para
-- alguém da outra sala. As faturas usam números 6001/6002 (não 2001/2002) para não
-- colidir visualmente com os comprovantes 1001/1002.

INSERT INTO idor_perfis (sala, numero, nome, email, telefone, cargo, salario, cpf, bio, papel, token) VALUES
    ('1', 1, 'Você (Aluno QA)', 'aluno@lab.com', '(11) 90000-0001', 'Estagiário(a) de QA', 1800.00, '000.000.000-00', 'Aprendendo sobre segurança ofensiva', 'aluno', 'TKN-AL-10001'),
    ('1', 2, 'Marina Silva', 'marina.silva@empresa-lab.com', '(11) 98877-6655', 'Gerente Financeira', 12300.00, '111.222.333-44', 'Adoro café e planilhas de Excel', 'aluno', 'TKN-MS-20045'),
    ('1', 3, 'Carlos Mendes', 'carlos.mendes@empresa-lab.com', '(11) 97766-5544', 'Diretor de TI', 18750.00, '123.456.789-00', '30 anos de carreira em tecnologia', 'aluno', 'TKN-CM-58231'),
    ('1', 4, 'Beatriz Souza', 'beatriz.souza@empresa-lab.com', '(11) 96655-4433', 'Analista de Compras', 5200.00, '222.333.444-55', 'Apaixonada por logística', 'aluno', 'TKN-BS-30099'),
    ('1', 5, 'Roberto Alves', 'roberto.alves@empresa-lab.com', '(11) 95544-3322', 'Sócio-Diretor', 42000.00, '333.444.555-66', 'Fundador da empresa', 'aluno', 'TKN-RA-40087'),
    ('2', 1, 'Você (Aluno QA)', 'aluno@lab.com', '(21) 90000-0002', 'Estagiário(a) de QA', 1800.00, '000.000.000-00', 'Aprendendo sobre segurança ofensiva', 'aluno', 'TKN-AL-90001'),
    ('2', 2, 'Marina Silva', 'marina.silva@empresa-lab.com', '(21) 99123-4567', 'Gerente Financeira', 12300.00, '444.555.666-77', 'Adoro café e planilhas de Excel', 'aluno', 'TKN-MS-77410'),
    ('2', 3, 'Carlos Mendes', 'carlos.mendes@empresa-lab.com', '(21) 97788-2233', 'Diretor de TI', 18750.00, '987.654.321-00', '30 anos de carreira em tecnologia', 'aluno', 'TKN-CM-90412'),
    ('2', 4, 'Beatriz Souza', 'beatriz.souza@empresa-lab.com', '(21) 96644-1122', 'Analista de Compras', 5200.00, '555.666.777-88', 'Apaixonada por logística', 'aluno', 'TKN-BS-66250'),
    ('2', 5, 'Roberto Alves', 'roberto.alves@empresa-lab.com', '(21) 95533-9988', 'Sócio-Diretor', 42000.00, '666.777.888-99', 'Fundador da empresa', 'aluno', 'TKN-RA-55310')
ON CONFLICT (sala, numero) DO NOTHING;

INSERT INTO idor_comprovantes (sala, numero, perfil_numero, valor, descricao) VALUES
    ('1', 1001, 1, 1800.00, 'Pagamento de bolsa-auxílio mensal'),
    ('1', 1002, 2, 4750.00, 'Pagamento de comissão sobre vendas do trimestre'),
    ('2', 1001, 1, 1800.00, 'Pagamento de bolsa-auxílio mensal'),
    ('2', 1002, 2, 5300.00, 'Pagamento de bônus de desempenho do semestre')
ON CONFLICT (sala, numero) DO NOTHING;

INSERT INTO idor_faturas (sala, numero, perfil_numero, valor, descricao) VALUES
    ('1', 6001, 1, 49.90, 'Assinatura Mensal Básica'),
    ('1', 6002, 4, 899.90, 'Assinatura Anual Premium'),
    ('2', 6001, 1, 49.90, 'Assinatura Mensal Básica'),
    ('2', 6002, 4, 1290.00, 'Plano Corporativo Premium Anual')
ON CONFLICT (sala, numero) DO NOTHING;

INSERT INTO idor_pedidos (sala, numero, perfil_numero, item, valor) VALUES
    ('1', 3001, 1, 'Curso Online de Introdução à Cibersegurança', 197.00),
    ('1', 3002, 5, 'Backup Completo do Banco de Dados Pessoal', 1200.00),
    ('2', 3001, 1, 'Curso Online de Introdução à Cibersegurança', 197.00),
    ('2', 3002, 5, 'Exportação Completa da Base de Clientes', 1500.00)
ON CONFLICT (sala, numero) DO NOTHING;

INSERT INTO idor_chamados (sala, numero, perfil_numero, assunto, mensagem) VALUES
    ('1', 4001, 1, 'Dúvida sobre meu boleto', 'Olá, gostaria de saber o vencimento do meu boleto deste mês.'),
    ('1', 4002, 2, 'Esqueci minha senha de administrador, me ajudem urgente', 'Pessoal, preciso redefinir a senha mestre do sistema financeiro hoje ainda, é urgente.'),
    ('2', 4001, 1, 'Dúvida sobre meu boleto', 'Olá, gostaria de saber o vencimento do meu boleto deste mês.'),
    ('2', 4002, 2, 'Não consigo acessar o painel de administrador, preciso de ajuda agora', 'Pessoal, o painel administrativo não abre, preciso disso resolvido com urgência hoje.')
ON CONFLICT (sala, numero) DO NOTHING;

INSERT INTO idor_mensagens (sala, numero, perfil_numero, conteudo) VALUES
    ('1', 5001, 1, 'Olá! Este é o seu canal privado com o suporte. Em que podemos ajudar?'),
    ('1', 5002, 3, 'Carlos, segue seu código de recuperação de acesso: 884215. Não compartilhe com ninguém.'),
    ('2', 5001, 1, 'Olá! Este é o seu canal privado com o suporte. Em que podemos ajudar?'),
    ('2', 5002, 3, 'Carlos, segue seu código de recuperação de acesso: 552031. Não compartilhe com ninguém.')
ON CONFLICT (sala, numero) DO NOTHING;
