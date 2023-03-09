const AuthTypeData = [
    "ECDSA"
]

const AuthType = new Enum(AuthTypeData)

class AuthData {
    constructor(authType, authMetadata) {
        if (!AuthTypeData[authType] || !authMetadata) {
            throw Error("")
        }
        this.authType = authType
        this.authMetadata = authMetadata
    }
}

class UserMetadata {
    constructor(roles, authDatas) {
        if (!roles || !authDatas | authDatas.map(authData => !(authData instanceof AuthData))) {
            throw Error("")
        }
        this.roles = roles
        this.authDatas = authDatas
    }
}

class User {
    constructor(userId, roles, authDatas) {
        this.userId = userId
        this.userMetadata = new UserMetadata(roles, authDatas)
    }

    async addRole(roleName) {

    }

    async removeRole(roleName) {

    }

    async addAuthData(authData) {

    }

    async removeAuthData(authData) {

    }
}