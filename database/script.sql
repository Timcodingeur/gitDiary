USE db_journal;

CREATE TABLE t_commits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hash VARCHAR(40) NOT NULL,
    time TEXT NOT NULL
);
