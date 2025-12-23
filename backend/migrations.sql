-- -----------------------------------------------------
-- 0. LIMPIEZA (DROP EVERYTHING)
-- -----------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS buckets;
DROP TABLE IF EXISTS accounts;
DROP VIEW IF EXISTS view_dashboard_buckets;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------
-- 1. TABLAS CON AUTO_INCREMENT
-- -----------------------------------------------------

-- ACCOUNTS
CREATE TABLE accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    start_date DATE,
    due_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- BUCKETS
CREATE TABLE buckets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- TRANSACTIONS
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATETIME NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    type VARCHAR(50) NOT NULL,
    account_id INT,
    bucket_id INT,
    source_bucket_id INT,
    description VARCHAR(255),
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tx_account FOREIGN KEY (account_id) REFERENCES accounts(id),
    CONSTRAINT fk_tx_bucket FOREIGN KEY (bucket_id) REFERENCES buckets(id),
    CONSTRAINT fk_tx_src_bucket FOREIGN KEY (source_bucket_id) REFERENCES buckets(id)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- 2. ÍNDICES
-- -----------------------------------------------------
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_acc_id ON transactions(account_id);

-- -----------------------------------------------------
-- 3. TRIGGERS (Misma lógica, compatible con INT)
-- -----------------------------------------------------
DELIMITER $$

-- TRIGGER INSERT
CREATE TRIGGER trg_tx_after_insert AFTER INSERT ON transactions FOR EACH ROW
BEGIN
    IF NEW.account_id IS NOT NULL THEN
        IF NEW.type = 'income' THEN UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
        ELSEIF NEW.type = 'expense' THEN UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
        END IF;
    END IF;
    IF NEW.bucket_id IS NOT NULL THEN
        IF NEW.type IN ('income', 'bucket_move') THEN UPDATE buckets SET balance = balance + NEW.amount WHERE id = NEW.bucket_id;
        ELSEIF NEW.type = 'expense' THEN UPDATE buckets SET balance = balance - NEW.amount WHERE id = NEW.bucket_id;
        END IF;
    END IF;
    IF NEW.source_bucket_id IS NOT NULL AND NEW.type = 'bucket_move' THEN
        UPDATE buckets SET balance = balance - NEW.amount WHERE id = NEW.source_bucket_id;
    END IF;
END$$

-- TRIGGER DELETE
CREATE TRIGGER trg_tx_after_delete AFTER DELETE ON transactions FOR EACH ROW
BEGIN
    IF OLD.account_id IS NOT NULL THEN
        IF OLD.type = 'income' THEN UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
        ELSEIF OLD.type = 'expense' THEN UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
        END IF;
    END IF;
    IF OLD.bucket_id IS NOT NULL THEN
        IF OLD.type IN ('income', 'bucket_move') THEN UPDATE buckets SET balance = balance - OLD.amount WHERE id = OLD.bucket_id;
        ELSEIF OLD.type = 'expense' THEN UPDATE buckets SET balance = balance + OLD.amount WHERE id = OLD.bucket_id;
        END IF;
    END IF;
    IF OLD.source_bucket_id IS NOT NULL AND OLD.type = 'bucket_move' THEN
        UPDATE buckets SET balance = balance + OLD.amount WHERE id = OLD.source_bucket_id;
    END IF;
END$$

-- TRIGGER UPDATE
CREATE TRIGGER trg_tx_after_update AFTER UPDATE ON transactions FOR EACH ROW
BEGIN
    -- Revertir OLD
    IF OLD.account_id IS NOT NULL THEN
        IF OLD.type = 'income' THEN UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
        ELSEIF OLD.type = 'expense' THEN UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
        END IF;
    END IF;
    IF OLD.bucket_id IS NOT NULL THEN
        IF OLD.type IN ('income', 'bucket_move') THEN UPDATE buckets SET balance = balance - OLD.amount WHERE id = OLD.bucket_id;
        ELSEIF OLD.type = 'expense' THEN UPDATE buckets SET balance = balance + OLD.amount WHERE id = OLD.bucket_id;
        END IF;
    END IF;
    IF OLD.source_bucket_id IS NOT NULL AND OLD.type = 'bucket_move' THEN
        UPDATE buckets SET balance = balance + OLD.amount WHERE id = OLD.source_bucket_id;
    END IF;

    -- Aplicar NEW
    IF NEW.account_id IS NOT NULL THEN
        IF NEW.type = 'income' THEN UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
        ELSEIF NEW.type = 'expense' THEN UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
        END IF;
    END IF;
    IF NEW.bucket_id IS NOT NULL THEN
        IF NEW.type IN ('income', 'bucket_move') THEN UPDATE buckets SET balance = balance + NEW.amount WHERE id = NEW.bucket_id;
        ELSEIF NEW.type = 'expense' THEN UPDATE buckets SET balance = balance - NEW.amount WHERE id = NEW.bucket_id;
        END IF;
    END IF;
    IF NEW.source_bucket_id IS NOT NULL AND NEW.type = 'bucket_move' THEN
        UPDATE buckets SET balance = balance - NEW.amount WHERE id = NEW.source_bucket_id;
    END IF;
END$$

DELIMITER ;
