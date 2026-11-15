/* ============================================================================
   Income Tracker - SQL Server schema
   ----------------------------------------------------------------------------
   Safe to run more than once: every object is created only if it is missing.
   Run it with:   npm run db:init
   or open it in VS Code (mssql extension) / SSMS and execute it.
   ========================================================================== */

IF DB_ID(N'IncomeTracker') IS NULL
    CREATE DATABASE IncomeTracker;
GO

USE IncomeTracker;
GO

/* ---------- Users: one row per account ----------------------------------- */
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users
    (
        Id           INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
        Email        NVARCHAR(254)      NOT NULL CONSTRAINT UQ_Users_Email UNIQUE,
        DisplayName  NVARCHAR(100)      NOT NULL,
        PasswordHash NVARCHAR(100)      NOT NULL,   -- bcrypt hash, never the password
        CreatedAt    DATETIME2(0)       NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME()
    );
END;
GO

/* ---------- Transactions: every row belongs to exactly one user ---------- */
IF OBJECT_ID(N'dbo.Transactions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Transactions
    (
        Id              INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_Transactions PRIMARY KEY,
        UserId          INT                NOT NULL
            CONSTRAINT FK_Transactions_Users REFERENCES dbo.Users (Id) ON DELETE CASCADE,
        Title           NVARCHAR(100)      NOT NULL,
        Category        NVARCHAR(50)       NOT NULL,
        [Type]          NVARCHAR(7)        NOT NULL
            CONSTRAINT CK_Transactions_Type CHECK ([Type] IN (N'Income', N'Expense')),
        Amount          DECIMAL(12, 2)     NOT NULL
            CONSTRAINT CK_Transactions_Amount CHECK (Amount > 0),
        TransactionDate DATE               NOT NULL,
        CreatedAt       DATETIME2(0)       NOT NULL CONSTRAINT DF_Transactions_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2(0)       NOT NULL CONSTRAINT DF_Transactions_UpdatedAt DEFAULT SYSUTCDATETIME()
    );
END;
GO

/* Every query filters by user and date, so index exactly that. */
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = N'IX_Transactions_User_Date'
                 AND object_id = OBJECT_ID(N'dbo.Transactions'))
BEGIN
    CREATE INDEX IX_Transactions_User_Date
        ON dbo.Transactions (UserId, TransactionDate DESC)
        INCLUDE ([Type], Amount, Category);
END;
GO

/* ---------- Optional: a least-privilege login for the app ----------------
   Recommended instead of using "sa". Uncomment, choose a strong password,
   run once, then put these credentials in your .env file.

USE master;
GO
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'income_app')
    CREATE LOGIN income_app WITH PASSWORD = N'<choose-a-strong-password>', CHECK_POLICY = ON;
GO
USE IncomeTracker;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'income_app')
    CREATE USER income_app FOR LOGIN income_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Users        TO income_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.Transactions TO income_app;
GO
*/
