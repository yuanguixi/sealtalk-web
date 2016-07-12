/// <reference path="../../../../typings/angularjs/angular.d.ts"/>
/// <reference path="server.ts"/>
/// <reference path="../model/webimModel.ts"/>


var mainCtr = angular.module("webim.main.controller", ["webim.main.server", "webim.conversation.server"]);


mainCtr.controller("mainController", ["$scope", "$state", "$window", "$timeout", "$http",
    "mainDataServer", "conversationServer", "mainServer", "RongIMSDKServer", "appconfig",
    function($scope: any, $state: angular.ui.IStateService, $window: angular.IWindowService, $timeout: angular.ITimeoutService,
        $http: angular.IHttpService,
        mainDataServer: mainDataServer, conversationServer: conversationServer, mainServer: mainServer, RongIMSDKServer: RongIMSDKServer, appconfig: any) {

        if (!mainDataServer.loginUser.id) {
            var userid = webimutil.CookieHelper.getCookie("loginuserid"),usertoken = webimutil.CookieHelper.getCookie("loginusertoken");
            if (userid) {
                mainDataServer.loginUser.id = userid;
                mainDataServer.loginUser.token = usertoken;
            } else {
                $state.go("account.signin");
            }
        }

        mainServer.user.getInfo(mainDataServer.loginUser.id).success(function(rep) {
            if (rep.code == 200) {
                mainDataServer.loginUser.nickName = rep.result.nickname
                mainDataServer.loginUser.firstchar = webimutil.ChineseCharacter.getPortraitChar(rep.result.nickname);
                mainDataServer.loginUser.portraitUri = rep.result.portraitUri
                angular.element(document.getElementById("loginuser")).css("background-color", webimutil.Helper.portraitColors[mainDataServer.loginUser.id.charCodeAt(0) % webimutil.Helper.portraitColors.length]);
            } else {
                console.log("get user info error")
            }
        }).error(function() {

        })

        $scope.mainData = <mainDataServer>mainDataServer;

        //按钮、面板显示控制
        $scope.showState = {
            isPhone: false,
            isChat: false
        }
        $scope.switchbtn = {
            isFriendList: false,
            issearchList: false
        }
        $scope.curCon = "";
        $scope.unSelect = function (curConVal: string) {
            if($scope.curCon){
              $('#' + $scope.curCon).removeClass("selected");
            }
            $('#' + curConVal).addClass("selected");
            $scope.curCon = curConVal;
        };

        $scope.selectGo = function(id: string, type: webimmodel.conversationType){
             if($scope.switchbtn.isFriendList){
               $state.go("main.friendinfo", { userid: id, groupid: "0", targetid: "0", conversationtype: "0" });
             }else{
               $state.go("main.chat", { targetId: id, targetType: type }, { location: "replace" });
             }
        }
        $scope.selectGoGroup = function(id: string, type: webimmodel.conversationType){
             if($scope.switchbtn.isFriendList){
               $state.go("main.groupinfo", { groupid: id, conversationtype: "0" });
             }else{
               $state.go("main.chat", { targetId: id, targetType: type }, { location: "replace" });
             }
        }
        $scope.selectMember = function(item: webimmodel.Member){
          $scope.atShow = false;
        }

        //查找好友
        //
        $scope.searchControl = {};

        $scope.$watch('switchbtn.isFriendList', function (newVal: boolean, oldVal: boolean) {
            if (newVal === oldVal)
                return;
            $scope.searchControl.clear();
        });
        $scope.search = function(content: string) {
            if (content.trim()) {
                var friendList = [].concat.apply([], mainDataServer.contactsList.subgroupList.map(function(item) { return item.list }));
                $scope.switchbtn.issearchList = true;
                $scope.searchList = <any>{};
                $scope.searchList.friendList = mainDataServer.contactsList.find(content, friendList) || [];

                $scope.searchList.groupList = mainDataServer.contactsList.find(content, mainDataServer.contactsList.groupList) || [];
            } else {
                $scope.switchbtn.issearchList = false;
            }
        }

        $scope.tonotification = function() {
            mainDataServer.notification.hasNewNotification = false;
            $state.go("main.notification");
        }

        $scope.showPasteDiv = function(visible: boolean){
            $scope.$broadcast('showPasteDiv', visible);
        }

        $scope.uploadPasteImage = function(){
            $scope.$broadcast('uploadPasteImage');
        }

        $scope.checkSend = function (e: any) {
            var pic = <any>document.getElementsByClassName("previewPic")[0];
            if(e.keyCode === 13 && pic.style.visibility == 'visible'){
              $scope.uploadPasteImage();
            }
        };

        function refreshconversationList() {
            $scope.mainData.conversation.updateConversations();
        }

        $scope.$on("conversationChange", function() {
            refreshconversationList();
        })

        $scope.$watch("mainData.conversation.totalUnreadCount", function(newVal: any, oldVal: any) {
            if (newVal == oldVal) {
                return;
            }
            if (window.Electron) {
                window.Electron.updateBadgeNumber(newVal);
            }
        });

        //窗口获得焦点时清除当前未读消息
        window.onfocus = function() {
            if ($state.is("main.chat")) {
                RongIMSDKServer.clearUnreadCount(mainDataServer.conversation.currentConversation.targetType, mainDataServer.conversation.currentConversation.targetId);
                mainDataServer.conversation.updateConversations();
            }
        }


        //页面加载时、控制页面的一些样式
        $scope.$on("$viewContentLoaded", function() {
            if ($state.is("main")) {
                $scope.showState.isChat = false;
            } else {
                $scope.showState.isChat = true;
            }

            function pageLayout() {
                if (document.documentElement.clientWidth < 600) {
                    $scope.showState.isPhone = true;
                    var ele = <any>document.querySelector(".mainBox");
                    if (ele) {
                        ele.style.width = document.documentElement.clientWidth - parseFloat(getComputedStyle(document.querySelector(".toolbar")).width) + "px";
                    }
                } else {
                    $scope.showState.isPhone = false;
                    var ele = <any>document.querySelector(".mainBox");
                    if (ele) {
                        ele.style.width = '314px';
                    }
                }
                var chat = document.getElementById("chatArea");
                if (chat) {
                    chat.style.height = document.documentElement.clientHeight - 54 + "px";
                }
                var arr = <any>document.getElementsByClassName("communicateList");
                for (let i = 0, len = arr.length; i < len; i++) {
                    arr[i].style.height = document.documentElement.clientHeight - 54 + "px";
                }
                if (document.getElementById("Messages")) {
                    document.getElementById("Messages").style.height = document.documentElement.clientHeight -
                        parseFloat(getComputedStyle(document.querySelector('.inputBox')).height) -
                        parseFloat(getComputedStyle(document.querySelector('.box_hd')).height) + "px";
                }
                if (document.getElementById("functionBox")) {
                    document.getElementById("functionBox").style.height = document.documentElement.clientHeight -
                        parseFloat(getComputedStyle(document.querySelector('.box_hd')).height) + "px";
                }
            }

            pageLayout();

            $window.onresize = function() {
                pageLayout();
                $scope.$apply();
            }

        });

        //初始化好友数据   邀请通知一起通过好友关系表获取解析
        mainDataServer.notification.notificationList = [];
        mainDataServer.contactsList.subgroupList = [];
        mainServer.friend.getAll().success(function(rep) {
            var arr = rep.result;
            for (let i = 0, len = arr.length; i < len; i++) {
                switch (arr[i].status) {
                    case webimmodel.FriendStatus.Agreed:
                        mainDataServer.contactsList.addFriend(new webimmodel.Friend({
                            id: arr[i].user.id,
                            name: arr[i].displayName || arr[i].user.nickname,
                            imgSrc: arr[i].user.portraitUri,
                        }));
                        break;
                    case webimmodel.FriendStatus.Requested:
                        mainDataServer.notification.addNotification(new webimmodel.NotificationFriend({
                            id: arr[i].user.id,
                            name: arr[i].user.nickname,
                            portraitUri: arr[i].user.portraitUri,
                            status: arr[i].status,
                            content: arr[i].message,
                            timestamp: (new Date(arr[i].updatedAt)).getTime()
                        }));
                        break;
                }
            }

            mainDataServer.notification._sort();
        }).error(function(e) {
            console.log(e);
        })

        //初始化黑名单数据
        mainDataServer.blackList.list = [];
        mainServer.user.getBlackList().success(function(rep) {
            var blist = rep.result;
            for (var i = 0, len = blist.length; i < len; i++) {
                mainDataServer.blackList.add(new webimmodel.Friend({
                    id: blist[i].user.id,
                    name: blist[i].user.nickname,
                    imgSrc: blist[i].user.portraitUri
                }));
            }
        }).error(function() {

        });

        //初始化群组数据
        mainDataServer.contactsList.groupList = [];
        mainServer.user.getMyGroups().success(function(rep) {
            var groups = rep.result;
            for (var i = 0, len = groups.length; i < len; i++) {
                var group = new webimmodel.Group({
                    id: groups[i].group.id,
                    name: groups[i].group.name,
                    imgSrc: groups[i].group.portraitUri,
                    upperlimit: 500,
                    fact: 1,
                    creater: groups[i].group.creatorId
                });
                mainDataServer.contactsList.addGroup(group);
                //获取群成员
                !function(groupid: string) {
                    mainServer.group.getGroupMember(group.id).success(function(rep) {
                        var members = rep.result;
                        for (var j = 0, len = members.length; j < len; j++) {
                            var member = new webimmodel.Member({
                                id: members[j].user.id,
                                name: members[j].user.nickname,
                                imgSrc: members[j].user.portraitUri,
                                role: members[j].role
                            });
                            mainDataServer.contactsList.addGroupMember(groupid, member);
                        }
                    });
                } (group.id);
            }
        }).error(function(err) {

        })

        RongIMSDKServer.init(appconfig.getAppKey());

        if(mainDataServer.loginUser.token){
          RongIMSDKServer.connect(<string>mainDataServer.loginUser.token).then(function(userId) {
              console.log("connect success1:" + userId);
              RongIMSDKServer.getConversationList().then(function(list) {
                  mainDataServer.conversation.updateConversations();
              });
          }, function(error) {
              if (error.tokenError) {
                  //token 错误。
                  mainServer.user.getToken().success(function(data: any) {
                      if (data.code == "200") {
                          RongIMSDKServer.connect(<string>data.result.token).then(function(userId) {
                              console.log("connect success2:" + userId);
                              RongIMSDKServer.getConversationList().then(function(list) {
                                  mainDataServer.conversation.updateConversations();
                              });
                          }, function(error) {
                              if (error.tokenError) {
                                  //token 错误。
                                  console.log('token error');
                              }
                              //其他错误
                              //TODO:逻辑未处理
                          });
                      } else {
                          $state.go("account.signin");
                      }
                  }).error(function(e) {
                      $state.go("account.signin");
                  });
              }
              //其他错误
              //TODO:逻辑未处理
          });
        }else{
          mainServer.user.getToken().success(function(data: any) {
              if (data.code == "200") {
                  RongIMSDKServer.connect(<string>data.result.token).then(function(userId) {
                      console.log("connect success3:" + userId);
                      RongIMSDKServer.getConversationList().then(function(list) {
                          mainDataServer.conversation.updateConversations();
                      });
                  }, function(error) {
                      if (error.tokenError) {
                          //token 错误。
                      }
                      //其他错误
                      //TODO:逻辑未处理
                  });
              } else {
                  $state.go("account.signin");
              }
          }).error(function(e) {
              $state.go("account.signin");
          });
        }



        var isReconnect = true;
        RongIMSDKServer.setConnectionStatusListener({
            onChanged: function(status: number) {
                switch (status) {
                    //链接成功
                    case RongIMLib.ConnectionStatus.CONNECTED:
                        console.log('链接成功');
                        break;
                    //正在链接
                    case RongIMLib.ConnectionStatus.CONNECTING:
                        console.log('正在链接');
                        break;
                    //重新链接
                    case RongIMLib.ConnectionStatus.DISCONNECTED:
                        console.log('断开连接');
                        if (!$state.is("account.signin")) {
                            $state.go("account.signin");
                        }
                        break;
                    //其他设备登陆
                    case RongIMLib.ConnectionStatus.KICKED_OFFLINE_BY_OTHER_CLIENT:
                        console.log('其他设备登录');
                        if (!$state.is("account.signin")) {
                            $state.go("account.signin");
                            webimutil.Helper.alertMessage.error("您的账号在其他地方登录!");
                            webimutil.NotificationHelper.showNotification({
                                title: "SealTalk",
                                icon: "assets/img/SealTalk.ico",
                                body: "您的账号在其他地方登录!"
                            })
                            if (window.Electron) {
                                window.Electron.kickedOff();
                            }
                        }
                        break;
                    //网络不可用
                    case RongIMLib.ConnectionStatus.NETWORK_UNAVAILABLE:
                        console.log('网络不可用');
                        checkNetwork({
                            onSuccess: function() {
                                reconnectServer();
                            }
                        })
                        break;
                }
            }
        })

        webimutil.NotificationHelper.onclick = function(n) {
            if (n.data)
                $state.go("main.chat", { targetId: n.data.targetId, targetType: n.data.targetType });
        }
        function sendReadReceiptMessage(messageuid: string, sendtime: number, targetType: webimmodel.conversationType, targetId: string){
          var messageUId = messageuid;
          var lastMessageSendTime = sendtime;
          var type = webimmodel.conversationType.Private;
          // 以上 3 个属性在会话的最后一条消息中可以获得。
          if(targetType != webimmodel.conversationType.Private){
            return;
          }
          var msg = RongIMLib.ReadReceiptMessage.obtain(messageUId, lastMessageSendTime, RongIMLib.ConversationType.PRIVATE);
          // var msg = RongIMLib.TextMessage.obtain('con');
          RongIMSDKServer.sendMessage(targetType, targetId, msg).then(function() {

          }, function(error) {
              console.log('sendReadReceiptMessage', error.errorCode);
          });
        }

        RongIMSDKServer.setOnReceiveMessageListener({
            onReceived: function(data: RongIMLib.Message) {
                if ($scope.mainData.loginUser.hasSound) {
                    var eleplay = <any>document.getElementById("playsound");
                    eleplay.play();
                }

                var msg = <any>webimmodel.Message.convertMsg(data);

                //同自己会话删除targetid为空
                if (msg.targetId == "") {
                    msg.targetId = mainDataServer.loginUser.id;
                    RongIMSDKServer.removeConversation(webimmodel.conversationType.Private, "").then(function() {
                        refreshconversationList();
                    });
                    return;
                }

                if ($state.is("main.chat") && !document.hidden) {
                    RongIMSDKServer.clearUnreadCount(mainDataServer.conversation.currentConversation.targetType, mainDataServer.conversation.currentConversation.targetId);
                }

                switch (data.messageType) {
                    case webimmodel.MessageType.ContactNotificationMessage:
                        RongIMSDKServer.clearUnreadCount(data.conversationType, data.targetId);
                        if (data.hasReceivedByOtherClient) {
                            //已在其他端接收过，不做处理。
                            break;
                        }
                        var contact = <webimmodel.ContactNotificationMessage>msg.content;
                        RongIMSDKServer.removeConversation(msg.conversationType, msg.targetId).then(function() {
                            refreshconversationList();
                        });

                        if (contact.operation == "Request") {
                            //好友请求
                            //添加到通知
                            //TODO:判断是否已经是好友防止离线消息补偿造成错误数据
                            if (!$state.is("main.notification")) {
                                $scope.mainData.notification.hasNewNotification = true;
                            }
                            var item = new webimmodel.NotificationFriend({
                                id: contact.sourceUserId,
                                name: contact.senderUserName,
                                portraitUri: contact.senderUserImgSrc,
                                content: contact.content,
                                status: webimmodel.FriendStatus.Requested + "",
                                timestamp: (msg.sentTime && msg.sentTime.getTime())
                            });
                            if (!item.name) {
                                //没获取到名称去服务器获取
                                mainServer.user.getInfo(contact.sourceUserId).success(function(rep) {
                                    item.name = rep.result.nickname;
                                    item.portraitUri = rep.result.portraitUri;
                                    item.firstchar = webimutil.ChineseCharacter.getPortraitChar(item.name);
                                    mainDataServer.notification.addNotification(item);
                                }).error(function() {
                                })
                            }else{
                                mainDataServer.notification.addNotification(item);
                            }
                        } else if (contact.operation == "AcceptResponse") {
                            //对方已同意
                            //好友列表里添加好友or同步好友列表
                            var friend = mainDataServer.contactsList.getFriendById(contact.sourceUserId);
                            if (!friend) {
                                mainServer.user.getInfo(contact.sourceUserId).success(function(rep) {
                                    var res = rep.result;
                                    mainDataServer.contactsList.addFriend(new webimmodel.Friend({
                                        id: res.id,
                                        name: res.nickname,
                                        imgSrc: res.portraitUri
                                    }));
                                    refreshconversationList();
                                }).error(function() {
                                    mainDataServer.contactsList.addFriend(new webimmodel.Friend({
                                        id: contact.sourceUserId,
                                        name: "网络原因暂未取到",
                                        imgSrc: ""
                                    }));
                                    refreshconversationList();
                                    // throw new Error("好友信息获取失败");
                                })
                            }
                        }
                        break;
                    case webimmodel.MessageType.DiscussionNotificationMessage:
                        // if (data.objectName == "RC:DizNtf" && !data.hasReceivedByOtherClient) {
                        //     //群组信息更新，已经在其他端接收过不做处理。
                        //     var discussionNotification = <any>data;
                        //     switch (discussionNotification.content.type) {
                        //         case 1:   //join
                        //             var changemembers = discussionNotification.content.extension.split(",");
                        //             var targetid = data.targetId;
                        //             var self = changemembers.indexOf(mainDataServer.loginUser.id + "");
                        //             if (self == -1) {
                        //                 for (var a = 0, len = changemembers.length; a < len; a++) {
                        //                     mainServer.user.getInfo(changemembers[a]).success(function(rep) {
                        //                         mainDataServer.contactsList.addDiscussionMember(targetid, new webimmodel.Member({
                        //                             id: rep.result.id,
                        //                             name: rep.result.nickname,
                        //                             imgSrc: rep.result.portraitUri,
                        //                             role: "1"
                        //                         }));
                        //                     }).error(function() {
                        //
                        //                     });
                        //                 }
                        //             } else {
                        //               RongIMSDKServer.getDiscussion(targetid).then(function (rep) {
                        //                   var discuss = rep.data;
                        //                   var members = discuss.memberIdList;
                        //                   // conv.title = discuss.name;
                        //                   // conv.firstchar = webimutil.ChineseCharacter.getPortraitChar(discuss.name);
                        //
                        //                   var temporarynotifi = new webimmodel.WarningNoticeMessage("邀请进入讨论组" + '"' + discuss.name + '"');
                        //                   mainDataServer.notification.addNotification(temporarynotifi);
                        //                   if (!$state.is("main.notification")) {
                        //                       mainDataServer.notification.hasNewNotification = true;
                        //                   }
                        //
                        //                   mainDataServer.contactsList.addDiscussion(new webimmodel.Discussion({
                        //                       id: discuss.id,
                        //                       name: discuss.name,
                        //                       imgSrc: '',
                        //                       upperlimit: 500,
                        //                       fact: 1,
                        //                       creater: discuss.creatorId,
                        //                       isOpen: true
                        //                   }));
                        //                   for (var j = 0, len = discuss.memberIdList.length; j < len; j++) {
                        //                       mainServer.user.getInfo(discuss.memberIdList[j]).then(function (repmem) {
                        //                           var member = new webimmodel.Member({
                        //                               id: repmem.data.result.id,
                        //                               name: repmem.data.result.nickname,
                        //                               imgSrc: repmem.data.result.portraitUri,
                        //                               role: "1"
                        //                           });
                        //                           mainDataServer.contactsList.addDiscussionMember(discuss.id, member);
                        //                       });
                        //                   }
                        //
                        //                   refreshconversationList();
                        //               }, function () {
                        //                   // conv.title = "未知讨论组";
                        //               });
                        //             }
                        //             break;
                        //         case 2:   //quit
                        //             var changemembers = discussionNotification.content.extension.split(",");
                        //             var targetid = data.targetId;
                        //             var self = changemembers.indexOf(mainDataServer.loginUser.id + "");
                        //             if (self == -1) {
                        //                 mainDataServer.contactsList.removeDiscussionMember(targetid, changemembers[0]);
                        //             } else {
                        //                 mainDataServer.contactsList.removeDiscussion(targetid);
                        //
                        //                 RongIMSDKServer.removeConversation(webimmodel.conversationType.Discussion, targetid).then(function() {
                        //                     refreshconversationList();
                        //                 });
                        //             }
                        //             break;
                        //         case 4:  //kick
                        //             var changemembers = discussionNotification.content.extension.split(",");
                        //             var targetid = data.targetId;
                        //             var self = changemembers.indexOf(mainDataServer.loginUser.id + "");
                        //             if (self == -1) {
                        //                 for (var a = 0, len = changemembers.length; a < len; a++) {
                        //                     mainDataServer.contactsList.removeDiscussionMember(targetid, changemembers[a]);
                        //                 }
                        //             } else {
                        //                 var temporarynotifi = new webimmodel.WarningNoticeMessage("讨论组" + '"' + mainDataServer.contactsList.getDiscussionById(targetid).name + '"' + '已将您踢出');
                        //                 mainDataServer.notification.addNotification(temporarynotifi);
                        //                 if (!$state.is("main.notification")) {
                        //                     mainDataServer.notification.hasNewNotification = true;
                        //                 }
                        //                 mainDataServer.contactsList.removeDiscussion(targetid);
                        //                 RongIMSDKServer.removeConversation(webimmodel.conversationType.Discussion, targetid).then(function() {
                        //                     refreshconversationList();
                        //                 });
                        //                 //退出会话状态
                        //                 if ($state.is("main.chat") && $state.params["targetId"] == targetid && $state.params["targetType"] == webimmodel.conversationType.Discussion) {
                        //                     $state.go("main");
                        //                 }
                        //             }
                        //             break;
                        //         case 3:  // rename
                        //             console.log("TODO:暂不做修改讨论组名称");
                        //             // var temporarynotifi = new webimmodel.WarningNoticeMessage("讨论组已更名为" + '"' + mainDataServer.contactsList.getDiscussionById(targetid).name + '"');
                        //             // mainDataServer.notification.addNotification(temporarynotifi);
                        //             // if (!$state.is("main.notification")) {
                        //             //     mainDataServer.notification.hasNewNotification = true;
                        //             // }
                        //             break;
                        //         default:
                        //             console.log("不支持操作类型" + discussionNotification.content.type);
                        //     }
                        //     conversationServer.asyncConverDiscussionNotifition(data, msg);
                        //     addmessage(msg);
                        // }
                        break;
                    case webimmodel.MessageType.VoiceMessage:
                        msg.isUnReade = true;
                    case webimmodel.MessageType.TextMessage:
                    case webimmodel.MessageType.LocationMessage:
                    case webimmodel.MessageType.ImageMessage:
                    case webimmodel.MessageType.RichContentMessage:
                        if ($state.is("main.chat") && !document.hidden){
                          sendReadReceiptMessage(data.messageUId, data.sentTime, mainDataServer.conversation.currentConversation.targetType, mainDataServer.conversation.currentConversation.targetId);
                        }
                        addmessage(msg);
                        //TODO 判断是@消息时添加
                        if(msg.mentionedInfo){
                          var isAtMe = false;
                          if(msg.mentionedInfo.type == webimmodel.AtTarget.All){
                            isAtMe = true;
                          }
                          if(msg.mentionedInfo.type == webimmodel.AtTarget.Part){
                            for(var j = 0; j < msg.mentionedInfo.userList.length; j++){
                               if(msg.mentionedInfo.userList[j] == mainDataServer.loginUser.id){
                                 isAtMe = true;
                               }
                            }
                          }
                          if(isAtMe){
                            conversationServer.addAtMessage(msg.targetId, msg.conversationType, msg);
                          }
                        }

                        var isself = mainDataServer.loginUser.id == msg.senderUserId;
                        if (!isself) {
                          if(msg.senderUserName){
                            webimutil.NotificationHelper.showNotification({
                                title: msg.senderUserName,
                                icon: "assets/img/SealTalk.ico",
                                body: webimmodel.Message.messageToNotification(data, mainDataServer.loginUser.id, true), data: { targetId: msg.targetId, targetType: msg.conversationType }
                            });
                          }else{
                            mainServer.user.getInfo(msg.senderUserId).then(function(rep) {
                                msg.senderUserName = rep.data.result.nickname;
                                webimutil.NotificationHelper.showNotification({
                                    title: msg.senderUserName + "(非好友)",
                                    icon: "assets/img/SealTalk.ico",
                                    body: webimmodel.Message.messageToNotification(data, mainDataServer.loginUser.id, true), data: { targetId: msg.targetId, targetType: msg.conversationType }
                                });

                            })
                          }
                        }
                        break;
                    case webimmodel.MessageType.UnknownMessage:
                        if (data.objectName == "RC:GrpNtf" && !data.hasReceivedByOtherClient) {
                            //群组信息更新，已经在其他端接收过不做处理。
                            var groupNotification = <any>data.content;
                            var isself = false;
                            if(groupNotification.message.content.operatorUserId == mainDataServer.loginUser.id){
                              isself = true;
                            }
                            switch (groupNotification.message.content.operation) {
                                case "Add":
                                    var changemembers = groupNotification.message.content.data.data.targetUserIds.join().split(",");
                                    var groupid = data.targetId;
                                    var self = changemembers.indexOf(mainDataServer.loginUser.id + "");
                                    if (self == -1) {
                                        for (var a = 0, len = changemembers.length; a < len; a++) {
                                            mainServer.user.getInfo(changemembers[a]).success(function(rep) {
                                                mainDataServer.contactsList.addGroupMember(groupid, new webimmodel.Member({
                                                    id: rep.result.id,
                                                    name: rep.result.nickname,
                                                    imgSrc: rep.result.portraitUri,
                                                    role: "1"
                                                }));
                                            }).error(function() {

                                            });
                                        }
                                    } else {
                                        mainServer.group.getById(groupid).success(function(rep) {

                                            var temporarynotifi = new webimmodel.WarningNoticeMessage(groupNotification.message.content.data.data.operatorNickname + "邀请你加入了群组");
                                            mainDataServer.notification.addNotification(temporarynotifi);
                                            if (!$state.is("main.notification")) {
                                                mainDataServer.notification.hasNewNotification = true;
                                            }

                                            mainDataServer.contactsList.addGroup(new webimmodel.Group({
                                                id: rep.result.id,
                                                name: rep.result.name,
                                                imgSrc: rep.result.portraitUri,
                                                upperlimit: 500,
                                                fact: 1,
                                                creater: rep.result.creatorId
                                            }));
                                            mainServer.group.getGroupMember(groupid).success(function(rep) {
                                                var members = rep.result;
                                                for (var j = 0, len = members.length; j < len; j++) {
                                                    var member = new webimmodel.Member({
                                                        id: members[j].user.id,
                                                        name: members[j].user.nickname,
                                                        imgSrc: members[j].user.portraitUri,
                                                        role: members[j].role
                                                    });
                                                    mainDataServer.contactsList.addGroupMember(groupid, member);
                                                }
                                            });
                                            refreshconversationList();
                                        }).error(function() {

                                        })
                                    }
                                    break;
                                case "Quit":
                                    var changemembers = groupNotification.message.content.data.data.targetUserIds.join().split(",");
                                    var groupid = data.targetId;
                                    var self = changemembers.indexOf(mainDataServer.loginUser.id + "");
                                    if (self == -1) {
                                        mainDataServer.contactsList.removeGroupMember(groupid, changemembers[0]);
                                    } else {
                                        mainDataServer.contactsList.removeGroup(groupid);

                                        RongIMSDKServer.removeConversation(webimmodel.conversationType.Group, groupid).then(function() {
                                            refreshconversationList();
                                        });
                                    }
                                    break;
                                case "Kicked":
                                    var changemembers = groupNotification.message.content.data.data.targetUserIds.join().split(",");
                                    var groupid = data.targetId;
                                    var groupname = mainDataServer.contactsList.getGroupById(groupid) ? mainDataServer.contactsList.getGroupById(groupid).name : groupid;
                                    var self = changemembers.indexOf(mainDataServer.loginUser.id + "");
                                    if (self == -1) {
                                        for (var a = 0, len = changemembers.length; a < len; a++) {
                                            mainDataServer.contactsList.removeGroupMember(groupid, changemembers[a]);
                                        }
                                    } else {
                                        var temporarynotifi = new webimmodel.WarningNoticeMessage(groupNotification.message.content.data.data.operatorNickname + '将你移出了群组');
                                        mainDataServer.notification.addNotification(temporarynotifi);
                                        if (!$state.is("main.notification")) {
                                            mainDataServer.notification.hasNewNotification = true;
                                        }
                                        mainDataServer.contactsList.removeGroup(groupid);
                                        RongIMSDKServer.removeConversation(webimmodel.conversationType.Group, groupid).then(function() {
                                            refreshconversationList();
                                        });
                                        //退出会话状态
                                        if ($state.is("main.chat") && $state.params["targetId"] == groupid && $state.params["targetType"] == webimmodel.conversationType.Group) {
                                            $state.go("main");
                                        }
                                    }
                                    break;
                                case "Rename":
                                    // console.log("TODO:暂不做修改群组名称");

                                    var groupid = data.targetId;
                                    var groupname = mainDataServer.contactsList.getGroupById(groupid) ? mainDataServer.contactsList.getGroupById(groupid).name : groupid;
                                    var operator = isself ? "你" : groupNotification.message.content.data.data.operatorNickname;
                                    var temporarynotifi = new webimmodel.WarningNoticeMessage(operator + ' 修改群名称为' + groupNotification.message.content.data.data.targetGroupName);
                                    mainDataServer.notification.addNotification(temporarynotifi);
                                    if (!$state.is("main.notification")) {
                                        mainDataServer.notification.hasNewNotification = true;
                                    }
                                    mainDataServer.contactsList.updateGroupNameById(groupid, groupNotification.message.content.data.data.targetGroupName);
                                    mainDataServer.conversation.updateConversationTitle(webimmodel.conversationType.Group, groupid, groupNotification.message.content.data.data.targetGroupName);
                                    break;
                                case "Create":
                                    var groupid = data.targetId;
                                    mainServer.group.getById(groupid).success(function (rep) {
                                        var operator = isself ? "你" : groupNotification.message.content.data.data.operatorNickname;
                                        var temporarynotifi = new webimmodel.WarningNoticeMessage(operator + "创建了群组");
                                        mainDataServer.notification.addNotification(temporarynotifi);
                                        if (!$state.is("main.notification")) {
                                            mainDataServer.notification.hasNewNotification = true;
                                        }
                                        mainDataServer.contactsList.addGroup(new webimmodel.Group({
                                            id: rep.result.id,
                                            name: rep.result.name,
                                            imgSrc: rep.result.portraitUri,
                                            upperlimit: 500,
                                            fact: 1,
                                            creater: rep.result.creatorId
                                        }));
                                        mainServer.group.getGroupMember(groupid).success(function (rep) {
                                            var members = rep.result;
                                            for (var j = 0, len = members.length; j < len; j++) {
                                                var member = new webimmodel.Member({
                                                    id: members[j].user.id,
                                                    name: members[j].user.nickname,
                                                    imgSrc: members[j].user.portraitUri,
                                                    role: members[j].role
                                                });
                                                mainDataServer.contactsList.addGroupMember(groupid, member);
                                            }
                                        });
                                        refreshconversationList();
                                    }).error(function () {
                                    });
                                    break;
                                case "Dismiss":
                                    var groupid = data.targetId;
                                    var groupname = mainDataServer.contactsList.getGroupById(groupid) ? mainDataServer.contactsList.getGroupById(groupid).name : groupid;
                                    var operator = isself ? "你" : groupNotification.message.content.data.data.operatorNickname;
                                    var temporarynotifi = new webimmodel.WarningNoticeMessage(operator + "解散了群组");
                                    mainDataServer.notification.addNotification(temporarynotifi);
                                    if (!$state.is("main.notification")) {
                                        mainDataServer.notification.hasNewNotification = true;
                                    }
                                    mainDataServer.contactsList.removeGroup(groupid);
                                    RongIMSDKServer.removeConversation(webimmodel.conversationType.Group, groupid).then(function() {
                                        refreshconversationList();
                                    });
                                    //退出会话状态
                                    if ($state.is("main.chat") && $state.params["targetId"] == groupid && $state.params["targetType"] == webimmodel.conversationType.Group) {
                                        $state.go("main");
                                    }
                                    break;
                                default:
                                    console.log("不支持操作类型" + groupNotification.message.content.operation);
                            }
                            conversationServer.asyncConverGroupNotifition(data, msg);
                            addmessage(msg);
                        }
                        break;
                    case webimmodel.MessageType.InformationNotificationMessage:
                           addmessage(msg);
                        break;
                    default:
                        console.log(data.messageType + "：未处理")
                        break;
                }

                // $scope.mainData.conversation.updateConversations();
                $scope.mainData.conversation.updateConStatic(msg, true, $state.is("main.chat") && !document.hidden);
                $scope.$apply();

            }
        })

        function addmessage(msg: webimmodel.Message) {
            var hislist = conversationServer.historyMessagesCache[msg.conversationType + "_" + msg.targetId] = conversationServer.historyMessagesCache[msg.conversationType + "_" + msg.targetId] || []
            if (hislist.length == 0) {
                hislist.push(new webimmodel.GetHistoryPanel());
                if (msg.sentTime.toLocaleDateString() != (new Date()).toLocaleDateString())
                    hislist.push(new webimmodel.TimePanl(msg.sentTime));
            }
            conversationServer.addHistoryMessages(msg.targetId, msg.conversationType, msg);
            if (msg.messageType == webimmodel.MessageType.ImageMessage) {
                setTimeout(function() {
                    $scope.$broadcast("msglistchange");
                }, 200)
            } else {
                $scope.$broadcast("msglistchange");
            }
        }



        var reconnectTimes = 0, timeInterval = 20;
        function reconnectServer() {
            setTimeout(function() {
                RongIMSDKServer.reconnect({
                    onSuccess: function() {
                        reconnectTimes = 0;
                        console.log("reconnectSuccess");
                        RongIMSDKServer.getConversationList().then(function() {
                            mainDataServer.conversation.updateConversations();
                        });
                    },
                    onError: function() {
                        if (reconnectTimes <= 5) {
                            reconnectServer();
                            reconnectTimes += 1;
                        } else {
                            reconnectTimes = 0;
                            console.log("网络正常重连失败！！！");
                        }
                    }
                });
            }, timeInterval * reconnectTimes * 1000);
        }

        function checkNetwork(callback: any) {
            $http.get("index.html", {
                params: { t: Math.random() }
            }).success(function() {
                callback && callback.onSuccess && callback.onSuccess();
            }).error(function() {
                setTimeout(function() {
                    checkNetwork(callback);
                }, 5000);
            });
        }


    }]);
