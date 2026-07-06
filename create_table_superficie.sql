-- Lab Superfície de Ataque (Aula 17)
-- Rastreia quais exercícios cada aluno concluiu
CREATE TABLE IF NOT EXISTS superficie_progresso (
    aluno        VARCHAR(50)  NOT NULL,
    exercicio_id VARCHAR(20)  NOT NULL,
    concluido_em TIMESTAMP    DEFAULT NOW(),
    PRIMARY KEY (aluno, exercicio_id)
);
