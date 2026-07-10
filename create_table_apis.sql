-- Lab Segurança em APIs (Aula 18)
CREATE TABLE IF NOT EXISTS apis_progresso (
    aluno        VARCHAR(50)  NOT NULL,
    exercicio_id VARCHAR(20)  NOT NULL,
    concluido_em TIMESTAMP    DEFAULT NOW(),
    PRIMARY KEY (aluno, exercicio_id)
);
