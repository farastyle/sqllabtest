-- Lab Autenticação e Tokens (Aula 19)
CREATE TABLE IF NOT EXISTS tokens_progresso (
    aluno        VARCHAR(50)  NOT NULL,
    exercicio_id VARCHAR(20)  NOT NULL,
    concluido_em TIMESTAMP    DEFAULT NOW(),
    PRIMARY KEY (aluno, exercicio_id)
);
