const jwt = require('jsonwebtoken')


function verifyToken() {
    return async(ctx, next) => {
        const token = ctx.request.header.authorization
        if (token) {
            //解析token
            try {
                const decoded = jwt.verify(token, '666')
                if (decoded.id) {//token合法
                    ctx.userId = decoded.id
                    await next()
                }
            } catch (error) {
                ctx.status = 416
                ctx.body = {
                    message: 'token失效',
                    code: 0
                }

            }

        } else {
            ctx.status = 416
            ctx.body = {
                message: '请重新登录',
                code: 0
            }
        }
    }
}

module.exports = {
    verifyToken
}
