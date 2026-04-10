import mysql from "mysql2/promise";

const shouldUseDb = process.env.USE_DB === "true";

let pool = null;

if (shouldUseDb) {
	pool = mysql.createPool({
		host: process.env.DB_HOST || "localhost",
		port: Number(process.env.DB_PORT || 3306),
		user: process.env.DB_USER || "root",
		password: process.env.DB_PASSWORD || "",
		database: process.env.DB_NAME || "algoloyal",
		waitForConnections: true,
		connectionLimit: 10,
	});
}

export default pool;
