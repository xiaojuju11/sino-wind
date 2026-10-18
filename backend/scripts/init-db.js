const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: [path.resolve(__dirname, '../.env.local'), path.resolve(__dirname, '../.env')] })

async function init() {
  console.log('正在连接 MySQL 数据库服务...')
  const host = process.env.DB_HOST || 'localhost'
  const user = process.env.DB_USER || 'root'
  const password = process.env.DB_PASSWORD || ''
  const port = Number(process.env.DB_PORT || 3306)
  const dbName = process.env.DB_NAME || 'parent_kid_education'

  let connection
  try {
    connection = await mysql.createConnection({ host, user, password, port, multipleStatements: true })
    console.log(`成功连接到 MySQL (${host}:${port})！`)
  } catch (err) {
    console.error('连接 MySQL 失败：', err.message)
    console.error('请检查 .env 文件中的 DB_HOST, DB_USER, DB_PASSWORD, DB_PORT 配置。')
    process.exit(1)
  }

  const sqlFile = path.resolve(__dirname, '../database/schema.sql')
  const sql = fs.readFileSync(sqlFile, 'utf8')
  console.log(`正在执行数据库初始化脚本 (${sqlFile})...`)

  try {
    await connection.query(sql)
    console.log(`数据库 [${dbName}] 及所有数据表初始化完成！`)
  } catch (err) {
    console.error('执行 SQL 失败：', err.message)
    process.exit(1)
  } finally {
    await connection.end()
  }
}

init()
