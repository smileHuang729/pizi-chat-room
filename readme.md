## 启动
* npm install
* npm run serve
* npm run noApiServe （本地启动 所有接口都会截除 /api 前缀）
## 打包
* npm run build （环境变量 normalServe 会开启gzip）
* npm run nginx （环境变量 nginx 会开启gzip）
* npm run noApiBuild （环境变量 noApiServe 打包后 所有接口前缀都无 /api 前缀）
