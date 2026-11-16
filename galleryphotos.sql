-- Käivita oma Greeny andmebaasis, mille nimi on .env failis DB_NAME.
-- Kui tabel on juba olemas, ei kustuta see olemasolevaid ridu.
CREATE TABLE IF NOT EXISTS galleryphotos (
    id INT(4) NOT NULL AUTO_INCREMENT,
    filename VARCHAR(100) NOT NULL,
    origname VARCHAR(100) NOT NULL,
    alttext VARCHAR(256) NULL,
    privacy INT(1) NOT NULL,
    userid INT(4) NOT NULL,
    created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted DATETIME NULL,
    PRIMARY KEY (id)
) ENGINE = InnoDB;
