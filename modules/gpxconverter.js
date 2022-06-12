const errors = []

function addError(error) {
    errors.push(error)
}

function getErrors() {
    return errors
}

function clearErrors() {
    console.log(errors);
    errors.map((el, i, arr) => {
        arr.splice(i)
    }, errors)
    console.log(errors);
}

module.exports = {
    addError,
    getErrors,
    clearErrors
}