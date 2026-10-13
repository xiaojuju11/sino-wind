const mysql = require('mysql2/promise')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })
if (require('fs').existsSync(path.resolve(__dirname, '../../.env.local'))) {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local'), override: true })
}
module.exports = mysql.createPool({
  host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'parent_kid_education',
  port: Number(process.env.DB_PORT || 3306), waitForConnections: true, connectionLimit: 10
})
