
var qqinfo = {
    loginType:2,//1：不登录 2：隐身登录 3：在线登录
    qq:153384209,//qq号
    pwd:'abc123'//qq密码
};




var http = require('http');
var url = require('url');
var qs = require('querystring');
var fs = require('fs');
var rl = require('readline');

function post(pUrl,headers,body,onResponse) {
    var args = url.parse(pUrl);
    //console.log(args);
    var options = args;
    if(headers)options.headers = headers;
    options.method = 'POST';
    //console.log(options);
    http.request(options, function(res) {
           if(res.statusCode!=200){
               onResponse(res);
               return;
          }
          var body = '';
          res.on('data', function (chunk) {
            body+=chunk;
          });
          res.on('end', function () {
            res.body = body;
            onResponse(res);
          });
    }).end(qs.stringify(body));
}

function get(pUrl,headers,onResponse) {
    var args = url.parse(pUrl);
    //console.log(args);
    var options = args;
    if(headers)options.headers = headers;
    options.method = 'GET';
    //console.log("Got response: " + res.statusCode);;
    http.request(options, function(res) {
         if(res.statusCode!=200){
               onResponse(res);
               return;
          }
          var body = new Buffer(1024*10);
          var size = 0;
          res.on('data', function (chunk) {
            size+=chunk.length;
            if(size>body.length){//每次扩展10kb
                var ex = Math.ceil(size/(1024*10));
                var tmp = new Buffer(ex * 1024*10);
                body.copy(tmp);
                body = tmp;
                //console.log('size'+size);
            }
            chunk.copy(body,size - chunk.length);
          });
          res.on('end', function () {
            res.body = new Buffer(size);
            body.copy(res.body);
            onResponse(res);
          });
    }).on('error', function(e) {
      console.log("Got error: " + e.message);
    }).end();
}













var userAgend = 'Mozilla/5.0 (Linux; U; Android 3.0; en-us; Xoom Build/HRI39) AppleWebKit/534.13 (KHTML, like Gecko) Version/4.0 Safari/534.13';

console.log('正在登录QQ：' + qqinfo.qq);
post('http://pt.3g.qq.com/handleLogin?a=b',{'User-Agent':userAgend
        ,'Content-Type' : 'application/x-www-form-urlencoded'
    }
    ,qqinfo
    ,function(res){
        if(res.statusCode == 302){
            var regex = new RegExp('sid=(.[^&]+)',"ig");
            regex.exec(res.headers.location);
            var sid = RegExp.$1;
            console.log('登录成功');//：'+sid);
            Vdata.sid = sid;
            getFriends();
            return;
        }
        if(res.body.indexOf('密码错误')>=0){
            console.log('密码错误');
            return;
        }
        if(res.body.indexOf('验证码')>=0){
            console.log('需要输入验证码');
            var regex = new RegExp(' src="(http://vc\.gtimg\.com.[^"]*)"','ig');
            regex.exec(res.body);
            var imgurl = RegExp.$1;
            get(imgurl,null,function(res) {
                    fs.writeFile('verify.gif', res.body,0,res.body.length,0, function (err) {
                        console.log('请输入目录下图片：verify.gif 的文字：(TODO:未完成！！)');                        
                        /*var tty = rl.createInterface(process.stdin, process.stdout, null);
                        tty.question('请输入目录下图片：verify.gif 的文字：', function(answer) {
                          
                        });    */  
                    });
            });
            return;
        }
        console.log(res.body);
    }
);

var Vdata = {
    sid:''
};
var Friends = [];

function getFriends(){
    Friends = [];
    console.log('正在获取好友列表...');
    getFriendsPage(1,function(){        
            console.log('\n在线好友'+Friends.length+'个：\n');
            for (var i = 0; i < Friends.length; i++) {
                var qinfo = Friends[i];
                console.log(i+1 + ':'+qinfo.name + '\t\t['+qinfo.qq+']');
            }
            settty();
    });
}

function getFriendsPage(page,next) {        
    var chatmain = 'http://q16.3g.qq.com/g/s?sid=$SID&aid=nqqchatMain&on=1&p=$Page';
    chatmain = chatmain.replace('$SID',Vdata.sid);
    chatmain = chatmain.replace('$Page',page);
    get(chatmain,{'User-Agent':userAgend},function(res) {
        //console.log(res.body.toString());return;
        var body = res.body.toString();
        var regex = new RegExp('u=(\\d+?)&.+?class="name.*?".*?>(.[^<>]*?)</span>','ig');
        while(regex.exec(body)){
            var qinfo = {qq:RegExp.$1,name:RegExp.$2.replace(/^ +?/,'')};
            Friends.push(qinfo);
        }
        var regex2 = new RegExp('第(\\d+?)/(\\d+?)页','ig');
        if(regex2.exec(body)) {
            var cur = parseInt(RegExp.$1);
            var max = parseInt(RegExp.$2);
            if(cur>=max){
                next();
                return;
            }
            getFriendsPage(cur+1,next);
        }else {
              next();  
        }
    });
}

var tty;
function settty() {
    if(tty)return;
    tty = rl.createInterface(process.stdin, process.stdout, null);
    var  prefix = '> ';
    tty.on('line', function(line) {
      switch(line.toLowerCase().trim()) {
        case '?':
        case 'help':
            console.log('命令列表：');
            console.log('q/quit：退出');
            console.log('o/online：在线列表');
            break;
        case 'o':
        case 'online':
            getFriends();
            break;
        case 'q':
        case 'quit':
            tty.close();
            process.exit(0);
            break;
        default:
          console.log('抱歉，我不能理解您的命令 `' + line.trim() + '`');
          break;
      }
    }).on('close', function() {
      console.log('再见!');
      process.exit(0);
    });
    console.log('输入?/help获得命令列表');
    tty.setPrompt(prefix, prefix.length);
    tty.prompt();
}