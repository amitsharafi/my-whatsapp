const authService = require('./auth.service')
const logger = require('../../services/logger.service')

async function login(req, res) {
  const credentials = req.body
  try {
    const user = await authService.login(credentials)
    const loginToken = authService.getLoginToken(user)
    console.log(loginToken)
    logger.info('User login: ', user)
    res.cookie('loginToken', loginToken, { sameSite: 'None', secure: true })
    res.json(user)
  } catch (err) {
    logger.error('Failed to Login ' + err)
    res.status(401).send({ err: 'Failed to Login' })
  }
}

async function signup(req, res) {
  try {
    const credentials = req.body
    // Never log passwords
    // logger.debug(credentials)
    const account = await authService.signup(credentials)
    logger.debug(`auth.route - new account created: ` + JSON.stringify(account))
    const user = await authService.login(credentials)
    logger.info('User signup:', user)
    const loginToken = authService.getLoginToken(user)
    res.cookie('loginToken', loginToken, { sameSite: 'None', secure: true })
    res.json(user)
  } catch (err) {
    logger.error('Failed to signup ' + err)
    res.status(500).send({ err: 'Failed to signup' })
  }
}

async function logout(req, res) {
  try {
    res.clearCookie('loginToken', { sameSite: 'None', secure: true })
    res.send({ msg: 'Logged out successfully' })
  } catch (err) {
    res.status(500).send({ err: 'Failed to logout' })
  }
}

module.exports = {
  login,
  signup,
  logout,
}
