class ApiError extends Error {
    constructor (
        statusCode = 500,
        message="Something went wrong",
        err= [],
        stack = ''
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message 
        this.success = false
        this.error = err

        if(stack){
            this.stack = stack
        }
        else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export {ApiError}