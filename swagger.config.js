export default {
  title: '药物相互作用查询系统 API',
  description: 'API文档 - 药物相互作用查询系统后端接口',
  version: '1.0.0',
  baseDir: process.cwd(),
  swaggerHtmlEndpoint: '/swagger',
  swaggerJsonEndpoint: '/swagger.json',
  swaggerOptions: {
    securityDefinitions: {
      Bearer: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header'
      }
    }
  }
}
