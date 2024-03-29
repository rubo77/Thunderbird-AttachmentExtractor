/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Attachment Extractor.
 *
 * The Initial Developer of the Original Code is
 * Andrew Williamson <eviljeff@eviljeff.com>.
 * Portions created by the Initial Developer are Copyright (C) 2006-2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): 
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var aewindow= {
	/* task variables */
	_tasks:new Array(),
	get currentTask() {/*aedump("[l:"+this._tasks.length+","+arguments.callee.caller.name+"]");*/ return this._tasks.length==0?null:this._tasks[0];},
	get remainingTasks() {return this._tasks.length-1;},
	addTask: function (t) {this.aedump('{function:AEWindow.addtask}\n');this._tasks.push(t);},
	nextTask: function () {this.aedump('{function:AEWindow.nexttask}\n');if (this._tasks.length>0) {this._tasks[0].tidyUp(); this._tasks.shift();} return;},
	
	/* shared objects */
	progress_tracker:null,
	messenger:null,
	prefs: null,
	
	/* classes */
	AEMessage:{},
	AETask: {},
	AEMsgDBViewCommandUpdater: function () {},
	
	/* useful get functions */
	get tb3() {return this.messenger.saveAttachmentToFile!=null;},
	get taskWaiting() {return (window.opener&&window.opener.attachmentextractor)?window.opener.attachmentextractor.queuedTasks.length>0:false;},
	get currentMessage() {
		return (this._tasks.length>0)?this._tasks[0].currentMessage:null;
	},
	
	_filecomponent:Components.classes["@mozilla.org/file/local;1"],
    _fileinterface:Components.interfaces.nsIFile,
	get fileObject() {return this._filecomponent.createInstance(this._fileinterface);},
	
	_supportsarraycomponent:Components.classes['@mozilla.org/supports-array;1'],
	_supportsarrayinterface:Components.interfaces.nsISupportsArray,
	_arraycomponent:Components.classes['@mozilla.org/array;1'],
	_mutablearrayinterface:Components.interfaces.nsIMutableArray,
	get nsIArray() {
		return (this.tb3)?  this._arraycomponent.createInstance(this._mutablearrayinterface):
							this._supportsarraycomponent.createInstance(this._supportsarrayinterface);  		
	},
		
	_fileStatusHbox:null,
	set fileStatusVisible(v) {
		if (v) this._fileStatusHbox.removeAttribute('hidden');
    	else this._fileStatusHbox.setAttribute('hidden',true);
    },
	get fileStatusVisible() {
		return this._fileStatusHbox.getAttribute('hidden');
	},

	get messagePane() {
		return document.getElementById("aemessagepane");
	},
	
	/* useful utility functions */
	aedump: {},
	
	arraycompact: function(array) {
		return array.filter(function(item){return (item!==undefined);});
  	},

	DOWNLOADMANAGER_RETENTION_PREFNAME :"browser.download.manager.retention",
	DOWNLOADMANAGER_SHOWWINDOW_PREFNAME:"browser.download.manager.showWhenStarting" //openDelay
};

aewindow.init=function() {
    if (aewindow.progress_tracker) return null; //already been set so abort
    aewindow.progress_tracker=progress_tracker;
    aewindow.prefs=new AEPrefs();
    aewindow.aedump=aedump;
    aewindow.AEMessage=AEMessage;
    window.onerror=aewindow.errorCatcher;
	var Cc=Components.classes;
    var Ci=Components.interfaces;
    
	aewindow.messenger = Cc["@mozilla.org/messenger;1"].createInstance().QueryInterface(Ci.nsIMessenger);
	aewindow.msgWindow = Cc["@mozilla.org/messenger/msgwindow;1"].createInstance().QueryInterface(Ci.nsIMsgWindow);
 	aewindow.mailSession = Cc["@mozilla.org/messenger/services/session;1"].getService(Ci.nsIMsgMailSession);
	aewindow._fileStatusHbox=document.getElementById("status_file_hbox")
	aewindow.promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
	aewindow.strBundleService = (Cc["@mozilla.org/intl/stringbundle;1"].getService()).QueryInterface(Ci.nsIStringBundleService);
		
	aewindow.aeStringBundle=aewindow.strBundleService.createBundle("chrome://attachmentextractor_cont/locale/attachmentextractor.properties");
	aewindow.messengerStringBundle=aewindow.strBundleService.createBundle("chrome://messenger/locale/messenger.properties");
	
	aewindow.startTime=(new Date()).getTime();
	
	if ("arguments" in window && window.arguments.length > 0) {
		var task=new aewindow.AETask(window.arguments[0],window.arguments[1],window.arguments[2],aewindow, 
							window.arguments[3],window.arguments[4],window.arguments[5]);
		aewindow.addTask(task);
		if (!aewindow.currentTask.initialize()) return aewindow.consumeAETask();
		aewindow.currentTask.start();
    } else window.close();
	return null;
}

aewindow.uninit=function() {
	aewindow.aedump('{function:AEWindow.uninit}\n',2);
	aewindow.nextTask();
}

aewindow.errorCatcher=function(message,url,number) {
  try{
	aewindow.aedump("// error thrown: '"+message+"' @ line:"+number+" in "+url+"\n",0);
	var pwindow=(aewindow.progress_tracker)?aewindow.progress_tracker.getWindowByType("mail:3pane"):window;
	aewindow.promptService.alert(pwindow,
			aewindow.aeStringBundle.GetStringFromName("GenericErrorDialog"),
			aewindow.aeStringBundle.GetStringFromName("GenericErrorMessage2")+"\n\n"+message);
  }catch (e) {aewindow.aedump("// Catch 22: Error in the error catcher! : "+e+"\n",0);}
  window.close();
}

aewindow.consumeAETask=function() {
	aewindow.aedump('{function:AEWindow.consumeAETask}\n',2);
	aewindow.nextTask();
	aewindow.aedump('current task: '+aewindow.currentTask+"\n",2);
	if (!aewindow.currentTask) {
		aewindow.aedump("// AEDialog close.\n",2);
		window.close();
		//aewindow.aedump("// timespent: "+(((new Date).getTime())-aewindow.startTime)+" \n");
		return null;
	}	
	if (!aewindow.currentTask.initialize()) return aewindow.consumeAETask();
	aewindow.currentTask.start();
	return null;
};

/* ****************************** AETask ******************************************************** */

aewindow.AETask = function (savefolder,selectedMsgs,filenamepattern,aewindow,originalView,isBackground,justDeleteAttachments) {
  // utility functions
  var prefs = aewindow.prefs;
  
  //public vars
  /* this.membername=value */
  if (isBackground && !filenamepattern) filenamepattern=prefs.get("autoextract.filenamepattern");
  if (!filenamepattern || filenamepattern=="") filenamepattern=prefs.get("filenamepattern");
  this.currentMessage=null;
  this.currentUrl=null;
  this.detachCancellationTimeout=null;
  this.listeningforMessageId="";
  
  this.isExtractEnabled       = (!justDeleteAttachments && (isBackground || (prefs.get("extract.mode")!=-1)));
  this.isDeleteEnabled        = (!justDeleteAttachments && prefs.get(isBackground?"autoextract.delete":"actionafterextract.delete"));
  this.isMarkreadEnabled      = (!justDeleteAttachments && prefs.get(isBackground?"autoextract.markread":"actionafterextract.markread"));
  this.isSaveMessageEnabled   = (!justDeleteAttachments && prefs.get(isBackground?"autoextract.savemessage":"actionafterextract.savemessage"));
  this.isLaunchEnabled        = (!justDeleteAttachments && prefs.get(isBackground?"autoextract.launch":"actionafterextract.launch"));
  this.isDetachEnabled        = (justDeleteAttachments || prefs.get(isBackground?"autoextract.detach":"actionafterextract.detach"));
  this.isCleartagEnabled      = (isBackground && (prefs.get("autoextract.ontriggeronly") && prefs.get("autoextract.cleartag")));
  this.isNotifywhendoneEnabled= (!isBackground && (selectedMsgs.length>1 && prefs.get("notifywhendone")));
  this.isEndLaunchEnabled     = (!justDeleteAttachments && prefs.get(isBackground?"autoextract.endlaunch":"actionafterextract.endlaunch"));
  this.overwritePolicy        = (prefs.get(isBackground?"autoextract.overwritepolicy":"overwritepolicy"));
  this.detachMode             = (justDeleteAttachments? 1 : prefs.get(isBackground?"autoextract.detach.mode":"actionafterextract.detach.mode"));
  this.confirmDetach          = (!isBackground && this.isDetachEnabled && (this.detachMode!=0) && prefs.get("actionafterextract.detach.confirm"));
  
  //private vars
  /* var membername=value */
  var that=this;
  var Cc=Components.classes;
  var Ci=Components.interfaces;
  var Cr=Components.results;
  var currentviewpref=null;
  var downloadwindowpref=null;
  var downloadwindowdelay=null;
  var compactfolderspref=null;
  var currentindex=-1;
  var includeexcludearray=null;
  var initialized=false;
  var savedFiles=new Array();
  
  //protected methods
  function initialize() {
	if (initialized) return true;
	aewindow.aedump('{function:AETask.initialize}\n',2);
	this.filemaker=(justDeleteAttachments? null : new AttachmentFileMaker(filenamepattern,savefolder,aewindow));
  
	if (!selectedMsgs || selectedMsgs.length==0 ) {
		aewindow.aedump("// ae aborted because no messages selected.\n",0);
		return false;		
	}
	if (!savefolder && !justDeleteAttachments) {
		aewindow.aedump("// ae aborted because no save path passed on.\n",0);
		return false;		
	}
	if (isBackground && justDeleteAttachments) {
		aewindow.aedump("// ae aborted as you can't currently just delete attachments on auto-extract.\n",0);
		return false;	
	}
	if (this.confirmDetach && !aewindow.promptService.confirm(
		aewindow.progress_tracker.getWindowByType("mail:3pane"),
		aewindow.aeStringBundle.GetStringFromName("ConfirmDetachDialogTitle"),
		aewindow.aeStringBundle.GetStringFromName("ConfirmDetachDialogMessage"))) {
			aewindow.aedump("// ae aborted detach confirmation cancelled.\n",1);
			return false;
	}
	currentviewpref=prefs.get("mailnews.display.html_as","");
    downloadwindowpref=prefs.get(aewindow.DOWNLOADMANAGER_RETENTION_PREFNAME,"");
    downloadwindowdelay=prefs.get(aewindow.DOWNLOADMANAGER_SHOWWINDOW_PREFNAME,"");
    compactfolderspref=prefs.get("mail.prompt_purge_threshhold","");
	
	window.MsgWindowCommands = that;//new AEMsgWindowCommands(that); 
	
	if (originalView) {
		aewindow.gDBView = originalView.cloneDBView(aewindow.messenger, aewindow.msgWindow, new aewindow.AEMsgDBViewCommandUpdater());
	}else {
		aewindow.gDBView = Cc["@mozilla.org/messenger/msgdbview;1?type=threaded"].createInstance(Ci.nsIMsgDBView);
		aewindow.gDBView.init(aewindow.messenger, aewindow.msgWindow, new aewindow.AEMsgDBViewCommandUpdater());
	}
	if (aewindow.msgWindow.SetDOMWindow) aewindow.msgWindow.SetDOMWindow(window); //tb2
	else aewindow.msgWindow.domWindow = window;  //tb3
	
	aewindow.msgWindow.msgHeaderSink = that;
	aewindow.mailSession.AddMsgWindow(aewindow.msgWindow); 
	
	/*if (!aewindow.messagePane || !aewindow.messagePane.contentWindow) {
		aewindow.aedump("// aemessagepane not found.  Dialog already closed.\n",1);
		return false;
	}*/
	if (aewindow.messenger.SetWindow) aewindow.messenger.SetWindow(aewindow.messagePane.contentWindow, aewindow.msgWindow); //tb2
	else aewindow.messenger.setWindow(aewindow.messagePane.contentWindow, aewindow.msgWindow); //tb3
	aewindow.msgWindow.rootDocShell.appType = Ci.nsIDocShell.APP_TYPE_MAIL; 
	aewindow.msgWindow.rootDocShell.allowPlugins = false;
	aewindow.msgWindow.rootDocShell.allowJavascript = false;
	if (prefs.get("dontloadimages")) {
		aewindow.msgWindow.rootDocShell.allowImages = false;
		aewindow.messagePane.docShell.allowImages = false;
	}
	initialized=true;
	  
	Cc["@mozilla.org/messenger/services/session;1"].getService(Ci.nsIMsgMailSession).AddFolderListener(that, Ci.nsIFolderListener.added);
	
	// just check the first uri.  if its rss then show the third progress bar.
	//aewindow.aedump(selectedMsgs+selectedMsgs[0]+"\n");
    aewindow.fileStatusVisible=(selectedMsgs[0].folder && selectedMsgs[0].folder.server.type=="rss");
	//aewindow.fileStatusVisible=(aewindow.messenger.msgHdrFromURI(selectedURIs[0]).folder.server.type=="rss");
	return true;
  }
  this.initialize=initialize;
  
  this.start = function() {
	aewindow.aedump('{function:AETask.start}\n',2);
	aewindow.progress_tracker.starting_extraction();
	
	if (prefs.get("extractinlinetoo")) {
		prefs.set("mailnews.display.html_as",1,"");
	}
	prefs.set(aewindow.DOWNLOADMANAGER_RETENTION_PREFNAME,0,"");
	prefs.set(aewindow.DOWNLOADMANAGER_SHOWWINDOW_PREFNAME,false/*30000*/,"");
	prefs.set("mail.prompt_purge_threshhold",false,"");
	
	that.active=true; 
	aewindow.progress_tracker.reset_tracker();
	this.selectNextMessage();
  };
  
  this.selectNextMessage = function() {
    //try {
	aewindow.aedump('{function:AETask.selectNextMessage}\n',2);
	if (currentindex>-1 && that.isEndLaunchEnabled) that.storeSavedFiles();
	currentindex++;
	if (currentindex==selectedMsgs.length) {
		that.endAttachmentextraction();
	}
	else {
      try{		
		var msg=selectedMsgs[currentindex];
		that.currentMessage=new aewindow.AEMessage(msg,currentindex,aewindow);
		aewindow.progress_tracker.starting_message(currentindex,selectedMsgs.length);	
		//var changeFolder=isBackground;
		//var changeFolder=(aewindow.gDBView.searchSession==null)
		var changeFolder=true;
		try { 
			var a=aewindow.gDBView.QueryInterface(Ci.nsIMsgCopyServiceListener); 
			changeFolder=false;
		} catch (e) {aewindow.aedump("//ae: can safely change folder: "+changeFolder+"\n",3);}
		
		//aewindow.aedump("// current Folder: "+aewindow.gDBView.msgFolder.name+"\n");
		if (changeFolder&&aewindow.gDBView.msgFolder!=msg.folder) {
			aewindow.aedump("// ae: folder different so open new folder\n",3);
			var msgDb = (msg.folder.msgDatabase)?msg.folder.msgDatabase : msg.folder.getMsgDatabase(aewindow.msgWindow); 
			var sortType=(msgDb)?msgDb.dBFolderInfo.sortType:aewindow.gDBView.sortType;
			var sortOrder=(msgDb)?msgDb.dBFolderInfo.sortOrder:aewindow.gDBView.sortOrder;
			var viewFlags=(msgDb)?msgDb.dBFolderInfo.viewFlags:aewindow.gDBView.viewFlags;
			var count=new Object();
			aewindow.gDBView.open(msg.folder,sortType,sortOrder,viewFlags,count);
		} else aewindow.aedump("// ae: folder same so no need to open\n",3);
	
		var msgkey=msg.messageKey;
		var vindex=aewindow.gDBView.findIndexFromKey(msgkey, true);
		aewindow.aedump("[msgkey: "+msgkey+"; view index: "+vindex+"; folder: "+(msg.folder?msg.folder.name:null)+"]\n",1);
		//aewindow.gDBView.selectMsgByKey(msgkey); //disabled 5/1/07 to fix del/det bug
		aewindow.gDBView.loadMessageByViewIndex(vindex);
	  }catch (e) {
	  	aewindow.aedump("// "+e+" thrown in selectNextMessage, skipping...",0);
		that.selectNextMessage();
	  }
		//aewindow.messenger.OpenURL(uri);	
	}
  /*}
	catch (e) {
        alert(e.name+": "+e.message);
    }*/
  };
    
  this.endAttachmentextraction = function() {
	aewindow.aedump('{function:AETask.endAttachmentextraction}\n',2);
	if (!that.active) return;
	that.active=false;
	
	if (that.isEndLaunchEnabled) {
		var pref=(isBackground?"autoextract":"actionafterextract")+".endlaunch.application";
		if (prefs.hasUserValue(pref)&& savedFiles.length>0) {
		  try{ 
		    var exec=prefs.getFile(pref);
			var process=Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
			aewindow.aedump("// Launching external App ... '"+exec.leafName+"' with '"+savedFiles+"'\n",3);
			process.init(exec);
			process.run(false,savedFiles,savedFiles.length);
		  } catch (e) {
			  aewindow.aedump(e);
		  }
		}
	}
	setTimeout(aewindow.consumeAETask,1);
	if (that.isNotifywhendoneEnabled&&aewindow.remainingTasks==0&&!aewindow.taskWaiting) 
		aewindow.currentTask.alertCheck(
			aewindow.aeStringBundle.GetStringFromName("DoneExtractingDialogTitle"),
			aewindow.aeStringBundle.GetStringFromName("DoneExtractingDialogMessage"),
			aewindow.aeStringBundle.GetStringFromName("DoneExtractingDialogNotifyAgain"),
			'notifywhendone',
			true);
	//window.close();
  };
  
  this.tidyUp = function() { 
    if (!initialized) return;
	aewindow.aedump('{function:AETask.tidyUp}\n',2);
	if (that.currentMessage) that.currentMessage.cancel();
	if (prefs.get("extractinlinetoo")) {
		prefs.set("mailnews.display.html_as",currentviewpref,"");
	}
	prefs.set(aewindow.DOWNLOADMANAGER_RETENTION_PREFNAME,downloadwindowpref,"");
	prefs.set(aewindow.DOWNLOADMANAGER_SHOWWINDOW_PREFNAME,downloadwindowdelay,"");
	prefs.set("mail.prompt_purge_threshhold",compactfolderspref,"");
	
	Cc["@mozilla.org/messenger/services/session;1"].getService(Ci.nsIMsgMailSession).RemoveFolderListener(that);
	
	window.MsgWindowCommands=null;
	aewindow.msgWindow.msgHeaderSink=null;
	
	if (aewindow.messenger.SetWindow) aewindow.messenger.SetWindow(null, aewindow.msgWindow);
	else aewindow.messenger.setWindow(null, aewindow.msgWindow);
	aewindow.mailSession.RemoveMsgWindow(aewindow.msgWindow); 
	
	aewindow.progress_tracker.ended_extraction();
  }

  this.alertCheck= function(titletext,messagetext,dontasktext,pref,prefvalue){
	var checkResult = {value:prefvalue};
	var pwindow=aewindow.progress_tracker.getWindowByType("mail:3pane");
	aewindow.promptService.alertCheck(pwindow,titletext,messagetext,dontasktext,checkResult);
	prefs.set(pref,checkResult.value);
  };
  
  /* to implement nsIMsgHeaderSink */
  this.handleAttachment= function(contentType, url, displayName, uri, isExternalAttachment) {
	if (aewindow.progress_tracker.attachment_busy||aewindow.progress_tracker.is_detaching) return;
	aewindow.aedump('{function:AETask.handleAttachment}\n',2);  
	/*if (isExternalAttachment) {
		aewindow.aedump(displayName+" is external attachment so ignore\n",1);
		return;
	}*/
	if (contentType=="text/x-moz-deleted") {
		aewindow.aedump(displayName+" failed contentType check\n",1);
		return;
	}
	if (!include_exclude_check2(displayName)) {
  		aewindow.aedump(displayName+" failed include/exclude filename check\n",1);
		return;
  	}
  	that.currentMessage.addAttachment(contentType,url,displayName.replace(/ +/g, " "),uri,isExternalAttachment); 
  };
    
  this.onEndAllAttachments= function() {
		if (!that.active) return;
		aewindow.aedump('{function:AETask.onEndAllAttachments}\n',2);
		if (aewindow.progress_tracker.is_detaching) {
			//aewindow.aedump('//onEndAllAttachments\n',0);
			clearTimeout(that.detachCancellationTimeout);
			that.currentMessage.doAfterActions(aewindow.progress_tracker.message_states.DELTEMPFILE);
			return;
		}
		if ((!aewindow.progress_tracker.attachment_busy) && 
		  (selectedMsgs[currentindex]==that.currentMessage.msgHdr) ){ 
			that.currentMessage.attachmentextraction();
	    } 
  };    

  this.processHeaders= function(headerNameEnumerator, headerValueEnumerator, dontCollectAddress) {};
  this.onEndMsgDownload= function(url) {};
  this.resetProperties= function() {};
  this.addAttachmentField= function(a,b) {};
  this.onEndMsgHeaders= function(url) {
	  this.currentUrl=url;
  };
  this.onMsgHasRemoteContent= function(aMsgHdr) {};
  this.mDummyMsgHeader=null;
  this.getDummyMsgHeader=function() {
      if (!that.mDummyMsgHeader) that.mDummyMsgHeader = new nsDummyMsgHeader();
      return this.mDummyMsgHeader;
  };
    
  /* to implement nsIMsgWindowCommands */
  this.selectFolder= function(folderUri) {}; //tb3
  this.SelectFolder=this.selectFolder; //tb2
  
  this.selectMessage= function(messageUri) {
	 that.currentMessage.msgHdr=aewindow.messenger.msgHdrFromURI(messageUri);
	 aewindow.aedump("{function:AETask.selectMessage("+messageUri+")}\n");
	 var msgkey=that.currentMessage.msgHdr.messageKey;
	 aewindow.gDBView.loadMessageByViewIndex(aewindow.gDBView.findIndexFromKey(msgkey, true));
  };
  this.SelectMessage=this.selectMessage; //tb2
    
  /* to implement nsIMsgMessagePaneController or nsIMsgWindowCommands*/
  this.clearMsgPane= function() {};  
  
  /* to implement nsIFolderListener */
  
  this.OnItemAdded= function(parentItem, item) {
	if (that.listeningforMessageId=="") return;
	var mail=item.QueryInterface(Components.interfaces.nsIMsgDBHdr);
    var folder=parentItem.QueryInterface(Components.interfaces.nsIMsgFolder); 
   	if (mail.messageId==that.listeningforMessageId) {
		var vindex=aewindow.gDBView.findIndexFromKey(mail.messageKey, true);
		var newuri=folder.getUriForMsg(mail);
		aewindow.aedump("{function:AETask.OnItemAdded()}: view index: "+vindex+", oldURI: "+aewindow.currentMessage.msgHdr.folder.getUriForMsg(aewindow.currentMessage.msgHdr)+", newURI: "+newuri+"\n",2);
		if (vindex==0xFFFFFFFF) {
			aewindow.aedump("// try loading URI directly because can't find vindex\n",3)
			try {aewindow.messenger.openURL(newuri);
			}catch (e) {
				aewindow.aedump("// loading with OpenURL failed too\n",1);
				return;
			}
		} else {
			aewindow.gDBView.loadMessageByViewIndex(vindex);
		}
		that.currentMessage.msgHdr=mail;
		
	} else aewindow.aedump("// 'wrong' msgid added: "+mail.messageId+", ignoring.\n",3);
  };
 
  /*OnItemPropertyChanged: function(item, property, oldValue, newValue) {},
  OnItemRemoved: function(parentItem, item) {},
  OnItemIntPropertyChanged: function(item, property, oldValue, newValue) {},
  OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) {},
  OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue){},
  OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) {},
  OnItemEvent: function(folder, event) {}   */
  
  /* should support all interfaces we support */
  this.QueryInterface= function (iid)
  {
    if ((iid == Ci.nsIMsgWindowCommands) ||
		(aewindow.tb3 ? false : (iid == Ci.nsIMsgMessagePaneController)) || // only in tb2, in tb3 clearMsgPane is in nsIMsgWindowCommands
        (iid == Ci.nsIMsgHeaderSink) ||
		(iid == Ci.nsIFolderListener) ||
        (iid == Ci.nsISupports))
      return this;
    throw Cr.NS_NOINTERFACE;
  };
  
  this.storeSavedFiles=function() {
	for (var i=0;i<that.currentMessage.attachments_savedfile.length;i++) {
		if (that.currentMessage.attachments_savedfile[i]) 
				savedFiles.push('"'+that.currentMessage.attachments_savedfile[i].path+'"');
	}
  };
  
  this.getMessageHeader=function() {
	  return aewindow.currentMessage.msgHdr;
  };  
  
   //private methods
  
  function strToReg(value,index,array) {
	  if (value.charAt(0)=='/') {
		  var expr=value.substring(1,value.lastIndexOf('/'));
		  var flags=value.substring(value.lastIndexOf('/')+1);
		  aewindow.aedump("//directly specificed reg-ex: /"+expr+"/"+flags+"\n",3);
		  return new RegExp(expr,flags);
	  }
	  return new RegExp("^"+(value.replace(".","\\.").replace("*",".*"))+"$","i");
  }
  
  function include_exclude_check2(filename) {
	filename=filename.replace(/'/g,"\'");
	if (includeexcludearray==null) {
		includeexcludearray=prefs.get((prefs.get("includeenabled")==1)?"includepatterns4":"excludepatterns4").split(';');
		includeexcludearray=includeexcludearray.map(strToReg);
		aewindow.aedump("//includeexcludearray: "+includeexcludearray+"\n",3);	
	}
	if (prefs.get("includeenabled")==1) {
		var test=function(element) {return element.test(filename);};
    	return includeexcludearray.some(test,this);
	}
	else {
		var negtest=function(element) {return !element.test(filename);};
		return includeexcludearray.every(negtest,this);
	}
  };  
  
  function toString() {
	  return "savefolder: "+(savefolder?savefolder.path:null)+
	  		", selectedMsgs: "+selectedMsgs+
			", filenamepattern: "+filenamepattern+
			", isBackground: "+isBackground+
			", justDeleteAttachments: "+justDeleteAttachments;
  }; this.toString=toString;
}

/* ****************************** AEIndTask ******************************************************** */

aewindow.createAEIndTask = function (savefolder,message,attachments,filenamepattern) {
	var aeinternalobject=attachmentextractor; //exists because loaded in main window.
	aewindow.progress_tracker=progress_tracker;
    aewindow.prefs=aeinternalobject.prefs;
    aewindow.aedump=aedump;
    aewindow.AEMessage=AEMessage;
    aewindow.messenger = messenger;
	aewindow.msgWindow = msgWindow;
	aewindow.promptService=aeinternalobject.promptService;
	aewindow.strBundleService=aeinternalobject.strBundleService;
	aewindow.aeStringBundle=aeinternalobject.aeStringBundle;
	aewindow.messengerStringBundle=aeinternalobject.messengerStringBundle;
	
	if (!savefolder || !message) {
		aewindow.aedump("// ae aborted because either no message selected or no save path.\n",0);
		return;
	}
	aewindow.addTask(new aewindow.AEIndTask(savefolder,message,attachments,filenamepattern,aewindow));
	aewindow.progress_tracker.statusFeedback=aewindow.msgWindow.statusFeedback;
	if (aewindow.currentTask.confirmDetach && !aewindow.promptService.confirm(
			null,
			aewindow.aeStringBundle.GetStringFromName("ConfirmDetachDialogTitle"),
			aewindow.aeStringBundle.GetStringFromName("ConfirmDetachDialogMessage"))) {
				aewindow.aedump("// ae aborted detach confirmation cancelled.\n",1);
				return;
	}	
	aewindow.aedump(aewindow.currentTask+"\n",2);
	aewindow.currentTask.start();
}; 


aewindow.AEIndTask = function (savefolder,message,attachments,filenamepattern,aewindow) {
  var prefs = aewindow.prefs ;
 
  //public vars
  /* this.membername=value */
  if (!filenamepattern) filenamepattern=prefs.get("filenamepattern");
  this.filemaker=new AttachmentFileMaker(filenamepattern,savefolder,aewindow);
  this.currentMessage=null;
  this.detachCancellationTimeout=null;
  this.listeningforMessageId  = "";
  
  this.isDeleteEnabled        = false;
  this.isCleartagEnabled      = false;
  this.isMarkreadEnabled      = false;
  this.isNotifywhendoneEnabled= false;
  this.isSaveMessageEnabled   = false;
  this.isExtractEnabled       = (prefs.get("extract.mode")!=-1);
  this.isDetachEnabled        = prefs.get("actionafterextract.detach");
  this.isLaunchEnabled        = prefs.get("actionafterextract.launch");
  this.isEndLaunchEnabled     = prefs.get("actionafterextract.endlaunch");
  this.overwritePolicy        = prefs.get("overwritepolicy");
  this.detachMode             = prefs.get("actionafterextract.detach.mode");
  this.confirmDetach          = (this.isDetachEnabled && (this.detachMode!=0) && prefs.get("actionafterextract.detach.confirm"));
  
  //private vars
  /* var membername=value */
  var that=this;
  var Cc=Components.classes;
  var Ci=Components.interfaces;
  var Cr=Components.results;
  var downloadwindowpref     = prefs.get(aewindow.DOWNLOADMANAGER_RETENTION_PREFNAME,"");
  var downloadwindowdelay    = prefs.get(aewindow.DOWNLOADMANAGER_SHOWWINDOW_PREFNAME,"");
  var compactfolderspref     = prefs.get("mail.prompt_purge_threshhold","");
  var includeexcludearray    = null;
  var active=false;
  
  //protected methods
  this.start = function() {
	aewindow.aedump('{function:AETask.start}\n',2);
	aewindow.progress_tracker.starting_extraction();
	
	prefs.set(aewindow.DOWNLOADMANAGER_RETENTION_PREFNAME,0,"");
	prefs.set(aewindow.DOWNLOADMANAGER_SHOWWINDOW_PREFNAME,false/*30000*/,"");
	prefs.set("mail.prompt_purge_threshhold",false,"");
	//
	that.active=true; 
	aewindow.progress_tracker.reset_tracker();
	that.currentMessage=new aewindow.AEMessage(message,0,aewindow);
	for (var i=0; i<attachments.length;i++) {
		var a=attachments[i];
		if (!a.uri) a.uri=a.messageUri; // tb2 doesn't use uri.
		if (!a.displayName) a.displayName=a.name; // tb7 doesn't use displayName.
		/*if (!a.isExternalAttachment)*/ that.handleAttachment(a.contentType,a.url,a.displayName,a.uri,a.isExternalAttachment);
	}
	aewindow.progress_tracker.starting_message(0,1);	
	that.currentMessage.attachmentextraction()
  };
  
  this.selectNextMessage = function() {
    that.endAttachmentextraction();
  };
    
  this.endAttachmentextraction = function() {
	aewindow.aedump('{function:AETask.endAttachmentextraction}\n',2);
	if (!that.active) return;
	that.active=false;
	aewindow.nextTask();
  };
  
  this.tidyUp = function() {  
	aewindow.aedump('{function:AETask.tidyUp}\n',2);
	if (that.currentMessage) that.currentMessage.cancel();
	prefs.set(aewindow.DOWNLOADMANAGER_RETENTION_PREFNAME,downloadwindowpref,"");
	prefs.set(aewindow.DOWNLOADMANAGER_SHOWWINDOW_PREFNAME,downloadwindowdelay,"");
	prefs.set("mail.prompt_purge_threshhold",compactfolderspref,"");
	
	aewindow.progress_tracker.ended_extraction();
  }
  
  this.handleAttachment= function(contentType, url, displayName, uri, isExternalAttachment) 
  {
	aewindow.aedump('{function:AETask.handleAttachment}\n',2);  
	if (aewindow.progress_tracker.attachment_busy) return;
	if (!include_exclude_check2(displayName)) {
  		aewindow.aedump(displayName+" failed include/exclude filename check\n",1);
		return;
  	}
  	if (contentType=="text/x-moz-deleted") {
		aewindow.aedump(displayName+" failed contentType check\n",1);
		return;
	}
	that.currentMessage.addAttachment(contentType,url,displayName.replace(/ +/g, " "),uri,isExternalAttachment); 
  };
 
  this.getMessageHeader=function() {
	  return aewindow.currentMessage.msgHdr;
  };  

  
  //private methods
  
  function strToReg(value,index,array) {
	  if (value.charAt(0)=='/') {
		  var expr=value.substring(1,value.lastIndexOf('/'));
		  var flags=value.substring(value.lastIndexOf('/')+1);
		  aewindow.aedump("//directly specificed reg-ex: /"+expr+"/"+flags+"\n",3);
		  return new RegExp(expr,flags);
	  }
	  return new RegExp("^"+(value.replace(".","\\.").replace("*",".*"))+"$","i");
  }
  
  function include_exclude_check2(filename) {
	aewindow.aedump("//filename: "+filename+"\n");	
	filename=filename.replace(/'/g,"\'");
	if (includeexcludearray==null) {
		includeexcludearray=prefs.get((prefs.get("includeenabled")==1)?"includepatterns4":"excludepatterns4").split(';');
		includeexcludearray=includeexcludearray.map(strToReg);
		aewindow.aedump("//includeexcludearray: "+includeexcludearray+"\n",3);	
	}
	if (prefs.get("includeenabled")==1) {
		var test=function(element) {return element.test(filename);};
    	return includeexcludearray.some(test,this);
	}
	else {
		var negtest=function(element) {return !element.test(filename);};
		return includeexcludearray.every(negtest,this);
	}
  }; 
  
  function toString() {
	  return "savefolder: "+(savefolder?savefolder.path:null)+
	  		", message: "+message+
			", attachments: "+attachments.map(function (c) {return c.url;})+
			", filenamepattern: "+filenamepattern+
			", detachmode: "+this.getDetachMode;
  }; this.toString=toString;
}

/* ******************************** AEMessage ******************************************************* */

if (typeof AEMessage == "undefined") {

	function AEMessage(msghdr,messageIndex,aewindow) 
	{
		this.attachments_ct=new Array();
		this.attachments_url=new Array();
		this.attachments_display=new Array();
		this.attachments_uri=new Array();
		this.attachments_appendage=new Array();
		this.attachments_savedfile=new Array();
		this.attachments_external=new Array();
		this.deleted=false;
		this.headerDataCache=new AttachmentFileMaker.AttachmentFileMakerCache();
		this.detachTempFile=null;
		this.zerofileTimeout=null;
		this.cleanUpFilterTimeout=null;
		this.started=false;
		this.messageIndex=messageIndex;
		this.msgHdr=msghdr;
		this.prefs = aewindow.prefs;
		this.browserPersistObject=null;
	}
	
	AEMessage.prototype.cancel = function() {
		if (!this.started) return;
		if (this.browserPersistObject) this.browserPersistObject.cancelSave();
	};
	
	AEMessage.prototype.attachmentextraction = function() {
		this.started=true;
		if (aewindow.currentTask.isExtractEnabled&&this.attachments_ct.length>0) this.saveAtt(0);	
		else {
			aewindow.aedump("// no attachments to extract in this message\n",3);
			aewindow.progress_tracker.starting_markread();
			this.doAfterActions(-1);
		}
	};
	  
	AEMessage.prototype.saveAtt= function(attachmentindex) {
		aewindow.aedump('{function:AEMessage.saveAtt('+attachmentindex+')}\n',2);
		aewindow.progress_tracker.starting_attachment(attachmentindex,this.attachments_ct.length);
			 
		var attachment = this.getAttachment(attachmentindex);
		var file=aewindow.currentTask.filemaker.make(attachment.displayName,this.headerDataCache);
		if (file&&file.parent&&!file.parent.exists()) file.parent.create(file.DIRECTORY_TYPE,0600);
		//aewindow.aedump(attachment.uri+"\n"+attachment.url+"\n"+attachment);
	    
		var needsTimeout=false; //basically only TB2 needs this.
		if (file) {
		  if (attachment.isExternalAttachment) {
			try{
			  this.browserPersistObject=aeMessenger.saveExternalAttachment(attachment.url,file,attachmentindex);
			  if (!this.browserPersistObject) file=null;
			} catch (e) {
				aewindow.aedump(e+"\n");
				file=null;
			}
		  }
		  else {
			try {
			  if (this.prefs.get("extract.mode")!=0) {
				  file=aeMessenger.saveAttachmentToFolder(
				  attachment.contentType,
				  attachment.url,
				  file.leafName,
				  attachment.uri,
				  file.parent,
				  attachmentindex);
			  }
			  else {
				if (aewindow.messenger.saveAttachmentToFile) {
				  var listener={  OnStartRunningUrl:function (url) {},
					 			  OnStopRunningUrl:function (url,exitcode) {
									aewindow.currentMessage.saveAtt_cleanUp(attachmentindex,(exitcode!=0));
								  } };
				  aewindow.messenger.saveAttachmentToFile(
					file,
					attachment.url,
					attachment.uri,
					attachment.contentType,
					listener ); // tb3 only
				}
				else {
				  file=aewindow.messenger.saveAttachmentToFolder(
					attachment.contentType,
					attachment.url,
					encodeURIComponent(file.leafName),
					attachment.uri,
					file.parent); //tb2
				  needsTimeout=true;
				}  
			  }
			} catch (e) {
				aewindow.aedump(e+"\n");
				file=null;
			}
		  }
		}
		if (file) {
			this.attachments_savedfile[attachmentindex]=file;
			this.attachments_appendage[attachmentindex]=aewindow.currentTask.filemaker.lastMadeAppendage;
			if (needsTimeout) {
				aewindow.currentMessage.saveAtt_cleanUpFilter(attachmentindex);
				this.zerofileTimeout=setTimeout("aewindow.currentMessage.saveAtt_cleanUp("+attachmentindex+",false)",5000);
			}
		}
		else aewindow.currentMessage.saveAtt_cleanUp(attachmentindex,true);
	};
	
	AEMessage.prototype.saveAtt_cleanUpFilter=function(attachmentindex) {
		var sfile=this.attachments_savedfile[attachmentindex];
		if (sfile==null || (sfile.exists() && sfile.fileSize>0 /*aewindow.downloadManager.activeDownloadCount==0*/)  ) {
			aewindow.currentMessage.saveAtt_cleanUp(attachmentindex,false);
		}
		else this.cleanUpFilterTimeout=setTimeout("aewindow.currentMessage.saveAtt_cleanUpFilter("+attachmentindex+")",5);
	};
	
	AEMessage.prototype.saveAtt_cleanUp= function(attachmentindex,failure) {
		aewindow.aedump('{function:AEMessage.saveAtt_cleanUp('+attachmentindex+','+failure+')}\n',2);
		clearTimeout(this.zerofileTimeout);
		this.browserPersistObject=null;
		if (failure) {
			//aewindow.aedump("//ae: saving failure notification. ["+this.attachments_ct.length+"]\n",1);
			this.attachments_ct[attachmentindex]=undefined;
			this.attachments_url[attachmentindex]=undefined;
			this.attachments_display[attachmentindex]=undefined;
			this.attachments_uri[attachmentindex]=undefined;
			this.attachments_savedfile[attachmentindex]=undefined;
			this.attachments_appendage[attachmentindex]=undefined;
			this.attachments_external[attachmentindex]=undefined;
		}
		try{ 
		  if (aewindow.currentTask.isLaunchEnabled &&
				this.attachments_savedfile[attachmentindex]!=null && 
				this.attachments_savedfile[attachmentindex].exists()) {
			aewindow.aedump('{function:AEMessage.doLaunch}\n',2);
			this.attachments_savedfile[attachmentindex].launch();
		  } 
		} catch (e) {aewindow.aedump(e+"\n");}
		aewindow.progress_tracker.stopping_attachment(attachmentindex);
		attachmentindex++;
		if (attachmentindex>=this.attachments_ct.length) {
			setTimeout("aewindow.currentMessage.doAfterActions("+aewindow.progress_tracker.message_states.MARKREAD+")",
							this.prefs.get("nextattachmentdelay"));
		}
		else {
			setTimeout("aewindow.currentMessage.saveAtt("+attachmentindex+")",this.prefs.get("nextattachmentdelay"));
		}
	};
	  
	AEMessage.prototype.doAfterActions=function(startWithAction) {
		var thistask=aewindow.currentTask;
		if (startWithAction!=-1) aewindow.progress_tracker.state=startWithAction;
		
		var states=aewindow.progress_tracker.message_states;
		switch (aewindow.progress_tracker.state) {
			case states.MARKREAD : 
			  if (thistask.isMarkreadEnabled) {
				aewindow.aedump('{function:AEMessage.doMarkread}\n',2);
				aewindow.gDBView.doCommand(0); /* 0 = markMessagesRead */
				if (this.prefs.get("returnreceipts")) this.handleMDNResponse();
				//aedump(">> "+getMessageHeader().getStringProperty("AEMetaData.savepath")+"\n");
				//aedump(">> "+getMessageHeader().getStringProperty("AEMetaData.savedfiles")+"\n");
			  }
			case states.SAVEMESSAGE :
			  if (thistask.isSaveMessageEnabled) { 
				aewindow.aedump('{function:AEMessage.doSaveMessage}\n',2);
				aeMessenger.saveMessageToDisk(thistask.currentMessage.msgHdr,
											  thistask.filemaker.makeSaveMessage(this.headerDataCache));
				break;
			  }
			case states.CLEARTAG : 
			  if (thistask.isCleartagEnabled&&!this.isNewsMessage()) {
				aewindow.aedump('{function:AEMessage.doCleartag}\n',2);
				var uriarray = aewindow.nsIArray;
				var triggerTag=this.prefs.get("autoextract.triggertag");
				var hdr=thistask.getMessageHeader();
				if (uriarray.appendElement) uriarray.appendElement(hdr,false); //tb3
				else uriarray.AppendElement(hdr); // tb2
				try { 
					if (hdr.folder.removeKeywordsFromMessages) hdr.folder.removeKeywordsFromMessages(uriarray,triggerTag); //tb3
					else hdr.folder.removeKeywordFromMessages(uriarray,triggerTag); //tb2
				}catch (e) {aewindow.aedump("// removeKeywordFromMessages throws error: "+e+"\n",1);}
			  }
			case states.DETACH :
			  if (thistask.isDetachEnabled&&!this.isNewsMessage()&&!this.isRSSMessage()) {
				aewindow.aedump('{function:AEMessage.doDetach}\n',2);
				aewindow.progress_tracker.state=states.DETACH;
				thistask.listeningforMessageId=thistask.getMessageHeader().messageId;
				var acl=aewindow.arraycompact(this.attachments_ct);
				if (acl.length>0) {
				  if (thistask.detachMode!=0) { 
					var deleteAtt=(thistask.detachMode==1) || !thistask.isExtractEnabled;
					var savedfiles=(deleteAtt)? null : aewindow.arraycompact(this.attachments_savedfile);
					this.detachTempFile=aeMessenger.detachAttachments(aewindow.messenger,aewindow.msgWindow,acl,
																 aewindow.arraycompact(this.attachments_url),
																 aewindow.arraycompact(this.attachments_display),
																 aewindow.arraycompact(this.attachments_uri),
																 savedfiles);
				  } else {
					aewindow.messenger.detachAllAttachments(acl.length,acl,
																 aewindow.arraycompact(this.attachments_url),
																 aewindow.arraycompact(this.attachments_display), 
																 aewindow.arraycompact(this.attachments_uri),
																 false);
				  }	
				  thistask.detachCancellationTimeout=setTimeout("aewindow.currentMessage.doAfterActions("+states.DELTEMPFILE+")",5000);
				  break;
				}
			  }
			case states.DELTEMPFILE :
			  if (this.detachTempFile) {
				aewindow.aedump('{function:AEMessage.deleteDetachTempfile}\n',2);
				try {
					this.detachTempFile.remove(false);
				} catch (e) {aewindow.aedump(e);}
				this.detachTempFile=null;
			  }
			case states.SAVEMETADATA :
			  if (thistask.isExtractEnabled) {
				thistask.getMessageHeader().setStringProperty("AEMetaData.savepath",thistask.filemaker.destFolder.path);
				var Cc=Components.classes;
				var Ci=Components.interfaces;
				
				var fileHandler = Cc["@mozilla.org/network/io-service;1"]
						 .getService(Ci.nsIIOService).getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler);
				var meta=null;
				var savedfiles=aewindow.arraycompact(this.attachments_savedfile);
				for (var u = 0; u < savedfiles.length; ++u) {
				  meta=(meta)? meta+"," : meta="";
				  meta+= fileHandler.getURLSpecFromFile(savedfiles[u]).replace(/,/g,"%2C");
				}
				if (meta) thistask.getMessageHeader().setStringProperty("AEMetaData.savedfiles",meta);
			  }
			case states.DELETE : 
			  thistask.listeningforMessageId="";
			  if (this.deleted) break; else this.deleted=true;
		
			  aewindow.progress_tracker.stopping_message(this.messageIndex);
			  if (thistask.isDeleteEnabled&&!this.isNewsMessage()) {
				aewindow.aedump('{function:AEMessage.doDelete}\n',2);
				/*aewindow.gDBView.doCommand(7); // 7 = deleteMsg
				aewindow.gDBView.onDeleteCompleted(true);*/
				var messageArray = aewindow.nsIArray;
				var hdr=thistask.getMessageHeader();
				if (messageArray.appendElement) messageArray.appendElement(hdr,false); //tb3
				else messageArray.AppendElement(hdr); // tb2
				function DCopyListener(aewindow,delay) { 
					this.OnStartCopy=function() {}
					this.OnProgress=function(aProgress,aProgressMax) {}
					this.GetMessageId=function() {return null}
					this.SetMessageKey=function(aKey) {}
					this.OnStopCopy=function(aStatus) {setTimeout("aewindow.currentTask.selectNextMessage()",delay);}		
				};
				var dCopyListener=new DCopyListener(aewindow,this.prefs.get("nextmessagedelay"));
				hdr.folder.deleteMessages(messageArray,aewindow.msgWindow,false,false,dCopyListener,true); 
				break;
			  }
			  setTimeout("aewindow.currentTask.selectNextMessage()",this.prefs.get("nextmessagedelay"));
			  break;
			default: aewindow.aedump('{function:AEMessage.doAfterActions('+startWithAction+')}\n',2);
		}	  
	};
	  
	AEMessage.prototype.postProcessMessage=function(html) {
		aewindow.aedump('{function:AEMessage.postProcessMessage}\n',2);
		
		function replacer(str,p1,p2,p3) {
			//aewindow.aedump(str+", ");
			var dn=/&filename=([^&]*)/.exec(p2);
			dn=decodeURIComponent(dn[1]);
			//aewindow.aedump(dn+"\n");
			for (var i=0;i<aewindow.currentMessage.attachments_display.length;i++) {
				if (aewindow.currentMessage.attachments_display[i]==dn) {
				  if (aewindow.currentMessage.attachments_savedfile[i]) return p1+encodeURIComponent(aewindow.currentMessage.attachments_appendage[i])+p3;
				  else break;
				}
			}	  
			return str;
		}
		return html.replace(/(<IMG .*?SRC=")(?:mailbox|imap|news)-message([^"]*)(">)/gi,replacer);
	}
	   
	  // copied from mailnews/source/mail/base/content/mailWindowOverlay.js rev 1.210
	  // compacted, specialised for ae and return reciept pref overriding added.
	AEMessage.prototype.handleMDNResponse=function() {
		aewindow.aedump('{function:AEMessage.handleMDNResponse}\n',2);
		if (this.isNewsMessage()) return;
		var msgHdr = aewindow.currentTask.getMessageHeader();
		
		// if the message is marked as junk, do NOT attempt to process a return receipt in order to better protect the user
		var isJunk=false;
		try {
			var junkScore = msgHdr.getStringProperty("junkscore");
			isJunk =  ((junkScore != "") && (junkScore != "0"));
		}
		catch (e) {}
		if (isJunk) return;
	
		var mimeHdr;
		try {
		  mimeHdr = aewindow.currentTask.currentUrl.mimeHeaders;
		} catch (e) {return;}
		
		// If we didn't get the message id when we downloaded the message header, we cons up an md5: message id. 
		// If we've done that, we'll try to extract the message id out of the mime headers for the whole message.
		var msgId = msgHdr.messageId;
		if (msgId.split(":")[0] == "md5") {
		  var mimeMsgId = mimeHdr.extractHeader("Message-Id", false);
		  if (mimeMsgId) msgHdr.messageId = mimeMsgId;
		}
	
		const MSG_FLAG_MDN_REPORT_SENT = 0x800000;
		const MSG_FLAG_IMAP_DELETED      = 0x200000;
		var msgFlags = msgHdr.flags;
		if ((msgFlags & MSG_FLAG_IMAP_DELETED) || (msgFlags & MSG_FLAG_MDN_REPORT_SENT)) return;
		if (!mimeHdr.extractHeader("Disposition-Notification-To",false) && !mimeHdr.extractHeader("Return-Receipt-To",false)) return;
	
		// Everything looks good so far, let's generate the MDN response.
		var Ci=Components.interfaces;
		var Cr=Components.results;
		var mdnGenerator = Cc["@mozilla.org/messenger-mdn/generator;1"].createInstance(Ci.nsIMsgMdnGenerator);
		
		// 
		if (this.prefs.get("returnreceipts.override")) {
			var currentotherreturnpref =     prefs.get("mail.mdn.report.other","");
			var currentoutsidereturnpref =   prefs.get("mail.mdn.report.outside_domain","");
			var currentnotreturnpref =       prefs.get("mail.mdn.report.not_in_to_cc","");
			if (currentotherreturnpref==2)   prefs.set("mail.mdn.report.other",1,"");
			if (currentoutsidereturnpref==2) prefs.set("mail.mdn.report.outside_domain",1,"");
			if (currentnotreturnpref==2)     prefs.set("mail.mdn.report.not_in_to_cc",1,"");
		}
		try{
			mdnGenerator.process(0, aewindow.msgWindow, aewindow.currentTask.currentUrl.folder, msgHdr.messageKey, mimeHdr, true);
		}catch (e) {}
		if (this.prefs.get("returnreceipts.override")) {
			prefs.set("mail.mdn.report.other",currentotherreturnpref,"");
			prefs.set("mail.mdn.report.outside_domain",currentoutsidereturnpref,"");
			prefs.set("mail.mdn.report.not_in_to_cc",currentnotreturnpref,"");
		}
		
		// Reset mark msg MDN "Sent" and "Not Needed".
		const MSG_FLAG_MDN_REPORT_NEEDED = 0x400000;
		msgHdr.flags = (msgFlags & ~MSG_FLAG_MDN_REPORT_NEEDED);
		msgHdr.OrFlags(MSG_FLAG_MDN_REPORT_SENT);
	
		// Commit db changes.
		var msgdb = (aewindow.currentTask.currentUrl.folder.msgDatabase)? aewindow.currentTask.currentUrl.folder.msgDatabase : aewindow.currentTask.currentUrl.folder.getMsgDatabase(aewindow.msgWindow);
		if (msgdb) msgdb.Commit(1);
	}
	  
	AEMessage.prototype.isNewsMessage=function() {
		  return (this.msgHdr.folder.baseMessageURI.indexOf('news')==0);
	}
	  
	AEMessage.prototype.isRSSMessage=function() {
		  return (this.msgHdr.folder.baseMessageURI.indexOf('rss')==0); // ?? does this even work?
	}
	   
	AEMessage.prototype.addAttachment=function(contentType, url, displayName, uri, isExternalAttachment) {
		if (this.started) {
			if (aewindow && aewindow.aedump) aewindow.aedump("// AE: Extraction already started but TB adding more attachments.  Ignoring. \n",1);
			return;
		}
		//aewindow.aedump("{function:AEMessage.addAttachment("+contentType+","+url+","+displayName+","+uri+","+isExternalAttachment+")\n",3);
		this.attachments_ct.push(contentType);
		this.attachments_url.push(url);
		this.attachments_display.push(displayName);
		this.attachments_uri.push(uri);
		this.attachments_external.push(isExternalAttachment);
	};
	  
	AEMessage.prototype.getAttachment=function(index) {
		return {contentType:this.attachments_ct[index],
				url:this.attachments_url[index],
				displayName:this.attachments_display[index],
				uri:this.attachments_uri[index],
				isExternalAttachment:this.attachments_external[index]};
	};
}

aewindow.AEMsgDBViewCommandUpdater.prototype = 
{
  updateCommandStatus : function() {},
  displayMessageChanged : function(aFolder, aSubject, aKeywords) {},
  updateNextMessageAfterDelete : function() {},
  QueryInterface : function(iid) {
    if ((iid == Components.interfaces.nsIMsgDBViewCommandUpdater) ||
        (iid == Components.interfaces.nsISupports)) return this;
    throw Components.results.NS_NOINTERFACE;
  }
}

// 
function AEMsgWindowCommands(task) {
  this.SelectFolder= function(folderUri) {return task.SelectFolder(folderUri);};
  this.SelectMessage= function(messageUri) {return task.SelectMessage(messageUri);};
};

