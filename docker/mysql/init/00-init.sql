-- Create both main & shadow DBs, and a dedicated app user
CREATE DATABASE IF NOT EXISTS agritourism CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS agritourism_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE USER IF NOT EXISTS 'agri'@'%' IDENTIFIED BY 'agripass';
GRANT ALL PRIVILEGES ON agritourism.* TO 'agri'@'%';
GRANT ALL PRIVILEGES ON agritourism_shadow.* TO 'agri'@'%';
FLUSH PRIVILEGES;
