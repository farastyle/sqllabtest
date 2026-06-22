-- Script de criação da tabela do Laboratório de XSS
-- Mural de comentários: usado tanto para o XSS Refletido (busca) quanto para o XSS Armazenado (mural)

CREATE TABLE IF NOT EXISTS mural_comentarios (
    id SERIAL PRIMARY KEY,
    autor VARCHAR(100) NOT NULL,
    mensagem TEXT NOT NULL,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- Alguns comentários de exemplo para o mural já nascer com conteúdo
INSERT INTO mural_comentarios (autor, mensagem) VALUES
    ('Professor', 'Bem-vindo ao Mural do Laboratório! Use os payloads da barra lateral para testar o XSS Armazenado aqui. 🔬'),
    ('Aluno Teste', 'Esse curso está muito bom, aprendendo bastante sobre segurança!');
