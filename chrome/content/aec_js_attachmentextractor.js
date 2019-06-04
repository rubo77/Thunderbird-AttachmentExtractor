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
 * Portions created by the Initial Developer are Copyright (C) 2005-2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Alexander Ihrig
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

try {
  if (typeof Cc == "undefined") var Cc=Components.classes;
  if (typeof Ci == "undefined") var Ci=Components.interfaces;
  if (typeof Cr == "undefined") var Cr=Components.results;
}catch (e) {}

if (typeof AttachmentExtractor == "undefined") {
	function AttachmentExtractor() {
		/* constants */
		this.MRUMAXCOUNT=20;
		this.setupListenersDone=false;
		
		/*variables*/
		this.autoMsgs=new Array();
		this.queuedTasks=new Array();
		this.prefs= new AEPrefs();
		
		/* services */
		this.strBundleService = (Cc["@mozilla.org/intl/stringbundle;1"].getService()).QueryInterface(Ci.nsIStringBundleService);
		this.promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
		this.windowWatcherService=Cc['@mozilla.org/embedcomp/window-watcher;1'].getService().QueryInterface(Ci.nsIWindowWatcher);
		
		/* bundles */
		this.aeStringBundle=this.strBundleService.createBundle("chrome://attachmentextractor_cont/locale/attachmentextractor.properties");
		this.messengerStringBundle=this.strBundleService.createBundle("chrome://messenger/locale/messenger.properties");
	}
	
	AttachmentExtractor.prototype.init = function() {
		if (aedebug) this.createaedumpfile();
		
		var aefolderListener=this.createaefolderListener();
		this.checkForAutoTag();
		Cc["@mozilla.org/messenger/services/session;1"].getService(Ci.nsIMsgMailSession).
				AddFolderListener(aefolderListener, Ci.nsIFolderListener.propertyChanged );
				/* Ci.nsIFolderListener.added + Ci.nsIFolderListener.removed Ci.nsIFolderListener.all */
		if (Ci.nsIMsgFolderNotificationService.msgAdded) Cc["@mozilla.org/messenger/msgnotificationservice;1"].
				getService(Ci.nsIMsgFolderNotificationService).addListener(aefolderListener,Ci.nsIMsgFolderNotificationService.msgAdded );  //tb3
		else Cc["@mozilla.org/messenger/msgnotificationservice;1"].
				getService(Ci.nsIMsgFolderNotificationService).addListener(aefolderListener); //tb2
		
		window.addEventListener('load', this.setupListeners, true);
		/*window.addEventListener('unload', attachmentextractor.unSetupListeners, true);  //unnessecary?*/
		
		//sync up relative pref
		var rdsp;
		try{
		  if (this.prefs.hasUserValue("defaultsavepath.relative.key") && (rdsp=this.prefs.getRelFile("defaultsavepath.relative"))) this.prefs.setFile("defaultsavepath",rdsp);
		} catch (e) {aedump(e);}
		try{
		  if (this.prefs.hasUserValue("autoextract.savepath.relative.key") && (rdsp=this.prefs.getRelFile("autoextract.savepath.relative"))) this.prefs.setFile("autoextract.savepath",rdsp);
		} catch (e) {aedump(e);}
		this.prefs.aeBranch.QueryInterface(Ci.nsIPrefBranch).addObserver("savepathmru", this.prefObserver, false);
		this.prefs.aeBranch.QueryInterface(Ci.nsIPrefBranch).addObserver("defaultsavepath", this.prefObserver, false);
		this.prefs.aeBranch.QueryInterface(Ci.nsIPrefBranch).addObserver("autoextract.savepath", this.prefObserver, false);
		
		this.windowWatcherService.registerNotification(this.queuedTaskObserver);
	};
	
	/* access functions */
	
	AttachmentExtractor.prototype.doPatternAttachmentextraction = function(event,savelocation,all) {
		if (!all&&!this.getSelectedMessages()) return;
		var fnp=this.getFilenamePattern();
		if (!fnp) return;
		this.doAttachmentextraction(event,savelocation,all,fnp);
	};
	
	AttachmentExtractor.prototype.doAttachmentextraction = function(event,savelocation,all,fnp){
		var folder=null;
		savelocation=savelocation+"";
		var messages=(all)?this.collectMessagesFromFolder((all==2)):this.getSelectedMessages();
		aedump("messages: "+messages+"\n");
		//aedump("//ae: saveselect: "+saveselect+" all: "+all+"\n");
		switch (savelocation) {
			case "default": folder=this.getDefaultSaveFolder(); break;
			case "suggest": folder=this.getSuggestedSaveFolder(messages); break; 
			case "deleteAtt": this.startAttachmentextraction(null,messages,null,false,true); break;
			case "0": folder=this.getSaveFolder("messenger.save.dir",true); if (folder) this.addToMRUList(folder); break;
			default : folder=this.useMRU(savelocation);
		}
		if (folder) this.startAttachmentextraction(folder,messages,fnp,false,false);
	};
	
	AttachmentExtractor.prototype.doIndividualAttachmentextraction = function(savelocation,mode,fnp){
		var attachments;
		switch (mode) {
			case "selected": attachments=this.getSelectedAttachments();break;
			case "all":      attachments=currentAttachments;break;
			case "context":  attachments=this.getContextAttachment();break;
			default:					
		}
		//if (!attachments) return;
		var folder;
		savelocation=savelocation+"";
		aedump("//ae: attachments: "+attachments+" \n");
		switch (savelocation) {
			case "default": folder=this.getDefaultSaveFolder(); break;
			case "suggest": folder=this.getSuggestedSaveFolder(this.getSelectedMessages()); break; 
			case "0": folder=this.getSaveFolder("messenger.save.dir",true); if (folder) this.addToMRUList(folder); break;
			default : folder=this.useMRU(savelocation);
		} 
		//aedump("folder: "+folder);
		if (folder) aewindow.createAEIndTask(folder,this.getSelectedMessages()[0],attachments,fnp);
	};
	
	AttachmentExtractor.prototype.doBackgroundAttachmentextraction = function() {
		this.startAttachmentextraction(this.getAutoSaveFolder(),this.autoMsgs,null,true,false);
		this.autoMsgs=new Array();
	};
	
	AttachmentExtractor.prototype.doSingleBackgroundAttachmentextraction = function(message) {
		this.startAttachmentextraction(this.getAutoSaveFolder(),[message],null,true,false);
	};
	
	
	/* begining and ending functions */
		
	AttachmentExtractor.prototype.startAttachmentextraction = function(savefolder,messages,filenamepattern,background,deleteAtt) {
		if (this.prefs.get("queuerequests")) {
		  var aew=progress_tracker.getWindowByType("mail:AEDialog");
		  if (aew && aew.document.getElementById("aemessagepane")) {
			this.queuedTasks.push([savefolder,messages,filenamepattern,background,deleteAtt]);
			return;
		  }
		}
		this.openAEDialog(savefolder,messages,filenamepattern,background,deleteAtt);	
	}
		
	AttachmentExtractor.prototype.queuedTaskObserver = {
		observe:function(subject,topic,d) {
			var windowtype;
			try {
				var win=subject.QueryInterface(Ci.nsIDOMWindow);
			    windowtype=win.document.documentElement.getAttribute('windowtype');
			}catch (e) {}
			if (windowtype!="mail:AEDialog") return; 
			if (attachmentextractor.queuedTasks.length>0) {
			  var l=attachmentextractor.queuedTasks.shift();
			  if (l) attachmentextractor.openAEDialog(l[0],l[1],l[2],l[3],l[4]); 
			}
			else {
				
			}
		}
	};
	
	AttachmentExtractor.prototype.openAEDialog = function(savefolder,messages,filenamepattern,background,deleteAtt) {
		return window.openDialog("chrome://attachmentextractor_cont/content/aec_dialog_detachProgress.xul",
			"_blank", "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar",
			savefolder,messages,filenamepattern,gDBView,background,deleteAtt);
	};
	
	/* anxillary functions */
	
	AttachmentExtractor.prototype.collectMessagesFromFolder=function(deep) {
		
		function getSimpleEnumerator(nsIEnum) {
			// makes a nsISimpleEnumerator from a nsIEnumerator
			return {
				hasMoreElements:function() {
					try{nsIEnum.currentItem();}catch (e) {return false;}
					return true;
				},
				getNext:function() {
					var c=nsIEnum.currentItem();
					try{ nsIEnum.next(); }catch (e){}
					return c;
				},
				QueryInterface:function(iid) {
					if ((iid == Ci.nsISimpleEnumerator) || (iid == Ci.nsISupports)) return this;
					throw Cr.NS_NOINTERFACE;
				}
			};			
		}
		
		function getAllMessages_sub(folder,msgs,deep) {
		  var enumr;
		  if (view.msgFolder==folder) {
			var treeView = view.QueryInterface(Ci.nsITreeView);
			var msgdb=null;
			try {msgdb=mail.folder.getMsgDatabase(null);}catch (e){} // only needed for TB2 - will fail in TB3
			for (var i = 0; i < treeView.rowCount; i++) {
				var hdr=(view.getMsgHdrAt)?view.getMsgHdrAt(i):msgdb.GetMsgHdrForKey(view.getKeyAt(i));
				msgs.push(hdr);
			}
		  } else {
			enumr=(folder.messages)? folder.messages :folder.getMessages(msgWindow);
		  while (enumr.hasMoreElements()) {
			var msg=enumr.getNext().QueryInterface(Ci.nsIMsgDBHdr);
			  if (msg) msgs.push(msg);
		  }
		  }
		  if (deep && folder.hasSubFolders) {
			enumr=(folder.subFolders? folder.subFolders : getSimpleEnumerator(folder.GetSubFolders()));
			try {
			  while (enumr.hasMoreElements()) {
				getAllMessages_sub(enumr.getNext().QueryInterface(Ci.nsIMsgFolder),msgs,deep);
			  }
			} catch (e) {aedump("//ae: "+e+"\n",2);}		
		  }
		}
		
		var folders=(typeof gFolderTreeView == "function")? gFolderTreeView.getSelectedFolders() : GetSelectedMsgFolders();
		var msgs=new Array();
		var view = gDBView;
		
		for (var m=0;m<folders.length;m++) {
			getAllMessages_sub(folders[m],msgs,deep);
		}
		
		return msgs;
	};
	
	AttachmentExtractor.prototype.getSelectedAttachments=function() {
		var selectedAttachments = document.getElementById('attachmentList').selectedItems;
		var atts=new Array(selectedAttachments.length);
		for (var i = 0; i < selectedAttachments.length; i++) {
			atts[i]=selectedAttachments[i].attachment;
			if (!atts[i].uri) atts[i].uri=atts[i].messageUri; //not used in tb3 - tb2 uses messageUri rather than uri.
		}
		return atts;
	}
	
	AttachmentExtractor.prototype.getSelectedMessages=function() {
		if (typeof gFolderDisplay != "undefined") return gFolderDisplay.selectedMessages; //tb3
		var uris=GetSelectedMessages(); //tb2 have to mock it up
		if (uris.length==0) return null;
		var hdrs=new Array(uris.length);
		for (var i=0;i<hdrs.length;i++) {
			hdrs[i]=messenger.msgHdrFromURI(uris[i]);
		}
		return hdrs;
		/*else return gDBView.getMsgHdrsForSelection();*/
	}
	
	AttachmentExtractor.prototype.getContextAttachment=function() {
		function compareURL(urlA,urlB) {
			if (urlA==urlB) return true;
			//aedump("AE: Comparing1: "+urlA+" and "+urlB+"\n",3);
			var partsA=urlA.split('&').filter(function (p) {return (p.indexOf("mailbox")==0)||(p.indexOf("part")==0);});
			partsA.sort();
			var partsB=urlB.split('&').filter(function (p) {return (p.indexOf("mailbox")==0)||(p.indexOf("part")==0);});
			partsB.sort();
			if (partsA.length==0 || partsB.length==0) return false;
			//aedump("AE: Comparing2: "+decodeURIComponent(partsA.join('&'))+" and "+decodeURIComponent(partsB.join('&'))+"\n",3);
			return (decodeURIComponent(partsA.join('&'))==decodeURIComponent(partsB.join('&')));
		}
		for (var i=0;i<currentAttachments.length;i++) {
			//aedump("AE: Comparing0: "+gContextMenu.imageURL+" and "+currentAttachments[i].resource+"\n",3);
			if (gContextMenu.imageURL.indexOf("resource")==0 && currentAttachments[i].resource && (gContextMenu.imageURL==currentAttachments[i].resource)) return [currentAttachments[i]];
			if (compareURL(gContextMenu.imageURL,currentAttachments[i].url)) return [currentAttachments[i]];
		}
		return [];
	}
	
	AttachmentExtractor.prototype.getSaveFolder=function(pref,updatepref) {
		var Cc=Components.classes;
		var Ci=Components.interfaces;
		var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
		var windowTitle = this.aeStringBundle.GetStringFromName("FolderPickerDialogTitle");
	    try {
			fp.init(window, windowTitle, Ci.nsIFilePicker.modeGetFolder);
			aedump("getSaveFolder pref: "+pref+"\n");
			aedump("getSaveFolder pref.value: "+pref.value+"\n");
			try {
				if (pref.value) fp.displayDirectory = pref.value;
			} catch (e) {aedump(e,1);}

			// must use this lazy file picker method to wait for the dir result
			//
			let done = false;
			let rv, result;
			fp.open(result => {
				rv = result;
				done = true;
			});
			let thread = Components.classes["@mozilla.org/thread-manager;1"]
			                         .getService().currentThread;
			while (!done) {
			    thread.processNextEvent(true);
			}
			dir = fp.file.path;
			if (updatepref) this.prefs.setFile(pref, dir,"");
			return dir;
			//
			// end of the lazy file picker method
		} catch (e) {aedump(e,0);}
	};
	
	AttachmentExtractor.prototype.getDefaultSaveFolder=function() {
		if (this.prefs.hasUserValue("defaultsavepath")){ 
			return this.prefs.getFile("defaultsavepath");
		}
		else if (this.prefs.get("browser.download.useDownloadDir","")&&
				 this.prefs.hasUserValue("browser.download.defaultFolder","")) {
			return this.prefs.get("browser.download.defaultFolder","");
		} 
		else return this.prefs.get("messenger.save.dir");
	};
	
	AttachmentExtractor.prototype.getAutoSaveFolder=function() {
		if (this.prefs.hasUserValue("autoextract.savepath")) {
			return this.prefs.getFile("autoextract.savepath");
		}
		else return this.getDefaultSaveFolder();
	};
	
	AttachmentExtractor.prototype.getSuggestedSaveFolder=function(messages) {
		
		function extractKeywords(str,nodupes,excludedwords) {
			var out=str.toLowerCase().replace(/[\(\)\[\]\\\/\{\}\"\'\:\;\,\$\&]/g,"").split(/[ \-\_]/g);
			if (!excludedwords) excludedwords=new Array();
			return out.filter(function(element, index, array) {return (element!="" && excludedwords.indexOf(element)==-1 && (!nodupes || index==0 || array.lastIndexOf(element,index-1)==-1));});
		}
		function matchKeywords(keywords,leafName,nodupes) {
			aedump("{function matchKeywords} Keyword:  "+keywords+"\n");
			aedump("{function matchKeywords} leafName: "+leafName+"\n");
			aedump("{function matchKeywords} nodupes:  "+nodupes+"\n");
		    var folderwords=extractKeywords(leafName,true,null);
			var numMatches=0;
			for (var i=0;i<folderwords.length;i++) {
				var wordmatch=0;
				while (wordmatch!=-1) {
					wordmatch=keywords.indexOf(folderwords[i],wordmatch);
					if (wordmatch!=-1) {
						numMatches++;
						if (nodupes) wordmatch=-1; else wordmatch++;
					}
				}
			}
			//if (numMatches>0) aedump({toString:function() {return "folderwords ("+leafName+"): "+folderwords.join(",")+" matched against "+keywords.join(",")+"\n";}},3);
			return numMatches;
		}
		
		if (!this.prefs.hasUserValue("suggestfolder.parent.1")) {
			var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher);
			ww.openWindow(null, 'chrome://attachmentextractor_cont/content/settings/aec_prefs_general_suggest.xul',"", 'chrome,resizable,toolbar,modal', null);
		}
		if (!this.prefs.hasUserValue("suggestfolder.parent.1")) return false;
				
		var nodupes=this.prefs.get("suggestfolder.disregardduplicates");
		var excludedwords=this.prefs.get("suggestfolder.excludekeywords").split(",");
		var subjects="";
		for (var i=0;i<messages.length;i++) {
			subjects+=messages[i].mime2DecodedSubject+" ";
		}
		var keywords=extractKeywords(subjects,nodupes,excludedwords);
		// aedump(keywords.join(",")+"\n");
		
		var matchedFolders=new Array();
		
		var ps=this.prefs.aeBranch;  
		var pfc=1;
		var enumr;
		while (ps.prefHasUserValue("suggestfolder.parent."+pfc)) {
		  try {
			var folder=ps.getStringPref("suggestfolder.parent."+pfc);

			// since Tb 52 (or prior?) this 'folder' must be tweakt with FileUtils
			let FileUtils = Cu.import("resource://gre/modules/FileUtils.jsm").FileUtils;
			folder = new FileUtils.File(folder);

			aedump("Match folders and keywords: folder:          "+folder+"\n");
			aedump("Match folders and keywords: folder.leafName: "+folder.leafName+"\n");

			var numMatches=matchKeywords(keywords,folder.leafName,nodupes);
			if (numMatches>0) matchedFolders.push({f:folder,ct:numMatches});
			enumr=folder.directoryEntries;	
			aedump("enumr: "+enumr+"\n");
		    while (enumr.hasMoreElements()) {
				folder=enumr.getNext().QueryInterface(Ci.nsIFile);
				if (folder.isFile()) continue;
				numMatches=matchKeywords(keywords,folder.leafName,nodupes);
			aedump("numMatches: "+numMatches+"\n");
				if (numMatches>0) matchedFolders.push({f:folder,ct:numMatches});
			}
		  } catch (e) {aedump("//ae suggestfolder: "+e+"\n",2);}	
		  pfc++;
		}
		
		matchedFolders.sort(function(a,b){return b.ct - a.ct;});
		aedump({toString:function() {return matchedFolders.map(function(f){return f.f.leafName+" ["+f.ct+"]";}).join(",")+"\n";}},3);
		var maxm=this.prefs.get("suggestfolder.maxmatches");
		if (matchedFolders.length>maxm) matchedFolders.length=maxm;
		
		var out={selectedIndex:-1,browse:null}

// var matches=matchedFolders;
// for (var i=0;i < matches.length;i++) {
// aedump("matchedFolders: "+matches[i].f.path+"\n");
// }

		window.openDialog("chrome://attachmentextractor_cont/content/aec_dialog_suggestedFolder.xul", "",
						  "chrome, dialog, modal",matchedFolders,out);
		if (out.browse) {
			return this.addToMRUList(this.getSaveFolder("messenger.save.dir",true));
		}
		if (out.selectedIndex!=-1) {
			return matchedFolders[out.selectedIndex].f;
		}
		return false;
	};
	
	AttachmentExtractor.prototype.getFilenamePattern=function() {
		//var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
		var input = {value: this.prefs.get("filenamepattern")};
		var check = {value: false};
		var out   = {value: false};
		// 		
		window.openDialog("chrome://attachmentextractor_cont/content/aec_dialog_filenamePattern.xul", "",
						  "chrome, dialog, modal", input,check,out);
		if (!out.value) return null;
		try {
			var fm=new AttachmentFileMaker(null,null,null);
			input.value=fm.fixFilenamePattern(input.value);
		}catch (e) {aedump(e);}
		aedump("// "+check.value+"\n");
		if (check.value && input.value) this.prefs.set("filenamepattern",input.value);
		return input.value;
	}
	
	AttachmentExtractor.prototype.checkForAutoTag=function() {
		var ae_tag=this.prefs.get("autoextract.triggertag");
		if (!this.prefs.prefService.getBranch("").getPrefType("mailnews.tags."+ae_tag+".tag")) {
			aedump("// AE's auto-tag not found so add it.\n",0);
			var tagService = Cc["@mozilla.org/messenger/tagservice;1"].getService(Ci.nsIMsgTagService);
			tagService.addTagForKey(ae_tag,'AE AutoExtract','','');
		}
	};
	
	/* ********* listener and gui code ****************** */
	
	AttachmentExtractor.prototype.setupListeners=function() {
		if (attachmentextractor.setupListenersDone) return;
		aedump("{function:AttachmentExtractor.setupListeners}\n",3);
		try {
			attachmentextractor.clearMRU(attachmentextractor.MRUMAXCOUNT,attachmentextractor.prefs.get("savepathmru.count")+1); //clear any extra mru slots.
			
			var t;
			if ((t=document.getElementById('folderPaneContext'))) t.addEventListener('popupshowing',attachmentextractor.updateMRUVisability,false);
			if ((t=document.getElementById('threadPaneContext'))) t.addEventListener('popupshowing',attachmentextractor.updateMRUVisability,false); //tb2 + tb3b1
			if ((t=document.getElementById('mailContext')))       t.addEventListener('popupshowing',attachmentextractor.updateMRUVisability,false); //tb3>=b2
			
			if ((t=document.getElementById('messageMenuPopup')))  t.addEventListener('popupshowing',attachmentextractor.updateMRUVisability,false);
			
			document.getElementById('folderTree').addEventListener('select', attachmentextractor.updateAECommands, false);
			document.getElementById('threadTree').addEventListener('select', attachmentextractor.updateAECommands, false);
		}
		catch (e){aedump("// setuplisteners failed.\n"+e);}
		attachmentextractor.setupListenersDone=true;
	};
		
	AttachmentExtractor.prototype.updateAECommands=function() {
		//aedump('{function:AttachmentExtractor.updateAECommands}\n',2);
		var view = gDBView;
		
		if (view) document.getElementById('aec_commandset_folder').removeAttribute('disabled');
		else 	  document.getElementById('aec_commandset_folder').setAttribute('disabled','true');		
		if (view && view.numSelected>0) document.getElementById('aec_commandset_msg').removeAttribute('disabled');
		else 							document.getElementById('aec_commandset_msg').setAttribute('disabled','true');
	};
	
	AttachmentExtractor.prototype.updateMRUVisability=function(event) {
		//aedump('{function:AttachmentExtractor.updateMRUVisability}\n',2);
		var mru=attachmentextractor.prefs.get("savepathmru");
		var onImage=false;
		try {
			onImage= ((new nsContextMenu(event.target)).onImage);
		}catch (e) {aedump(e);}
		//aedump("// onImage "+onImage+"\n");
		
		var children = event.target.childNodes;
		var chattr;
		for (var i=0;i<children.length;i++) {
			if (!children[i]) continue; 
			
			if ((chattr=children[i].getAttribute("ae_image_menuitem"))) {
			  if (     (onImage && chattr=="IMAGE") || (!onImage && chattr=="NONIMAGE") ) {
				/*children[i].hidden=false;*/
				children[i].removeAttribute('hidden');
				//aedump("// unhiding "+children[i].id+"\n");
			  } 
			  else if ((onImage && chattr=="NONIMAGE") || (!onImage && chattr=="IMAGE") ) {
				/*children[i].hidden=true;*/
				children[i].setAttribute('hidden',true);
				//aedump("// hiding "+children[i].id+"\n");
				continue;
			  }
			}
			
			if ((chattr=children[i].getAttribute("ae_mru_menuitem"))) {
			  if (     (mru && chattr=="MRU") || (!mru && chattr=="NONMRU") ) {
				children[i].removeAttribute('hidden');
				//aedump("// unhiding "+children[i].id+"\n");
			  }
			  else if ((mru && chattr=="NONMRU") || (!mru && chattr=="MRU") ) {
				children[i].setAttribute('hidden',true);
				//aedump("// hiding "+children[i].id+"\n");
			  }
			}
		}
	};
		
	AttachmentExtractor.prototype.updateMRUList=function(parent) {
		var ps=attachmentextractor.prefs.prefService.getBranch("extensions.attachmentextractor_cont.");
		if (!ps.getBoolPref("savepathmru")) return;
		
		var children = parent.childNodes;
		var oncommand="attachmentextractor.do"+((parent.getAttribute("paramPattern")=="true")?"Pattern":"");
		if (parent.getAttribute("paramIndividual")=="true") oncommand+="IndividualAttachmentextraction('#',"+parent.getAttribute("paramAll")+");"
		else oncommand+="Attachmentextraction(event,'#',"+parent.getAttribute("paramAll")+");"
		
		for (var i=children.length-1;i>=0;i--) {
			if (children[i].getAttribute("ae_mru_menuitem")=="GENERATED") parent.removeChild(children[i]);
		}
		var count=ps.getIntPref("savepathmru.count");
		for (var i=0;i<=count;i++) {
			var menuitem = document.createElement( "menuitem" );
			menuitem.setAttribute( "crop", "center" );
			if (i<10) menuitem.setAttribute( "accesskey", ""+i );
			menuitem.setAttribute("command","");
			menuitem.setAttribute("ae_mru_menuitem","GENERATED");
			menuitem.setAttribute("oncommand",oncommand.replace(/#/,i));	
			if (i==0) menuitem.setAttribute( "label", "(0) "+parent.getAttribute("browseText"));
			else {
				var pv=(ps.prefHasUserValue("savepathmru."+i))?ps.getStringPref("savepathmru."+i):null;
				if (!pv || pv=="") pv="< ... >";
				if (i<10) pv="("+i+") "+pv;
				menuitem.setAttribute('label',pv);
			}
			parent.appendChild( menuitem );
		}
	};
	
	AttachmentExtractor.prototype.onShowAttachmentContextMenu=function(event) {
		//aedump('{function:AttachmentExtractor.onShowAttachmentContextMenu}\n',2);
		var attachmentList = document.getElementById('attachmentList');
	
		var canOpen = false;
		if (document.getElementById('context-saveAttachment').getAttribute('disabled')!="true") {
			for (var i = 0; i < attachmentList.selectedItems.length && !canOpen; i++) {
				canOpen = !attachmentList.selectedItems[i].attachment.isExternalAttachment;
				//aedump(" * "+attachmentList.selectedItems[i].attachment.isExternalAttachment);
			} //aedump(" post: "+canOpen+" | "+attachmentList.selectedItems.length+"\n");
		} //aedump("//canOpen: "+canOpen+"\n");  
		if (canOpen) document.getElementById('aec_commandset_ind').removeAttribute('disabled');
		else 		 document.getElementById('aec_commandset_ind').setAttribute('disabled',"true");
		
		attachmentextractor.updateMRUVisability(event);
	};
		
	AttachmentExtractor.prototype.addToMRUList=function(added) {
		var ps=this.prefs.aeBranch;  
		if (!ps.getBoolPref("savepathmru")||!added) return added;
		var count=ps.getIntPref("savepathmru.count");
		var old=(ps.prefHasUserValue("savepathmru.1"))?ps.getStringPref("savepathmru.1"):null;
		if (old && (added == old)) return added;
		ps.setStringPref("savepathmru.1",added);
		if (!old) return added;
		var prev=old;
		var i=2;
		for (;i<=count;i++) {
			old=(ps.prefHasUserValue("savepathmru."+i))?ps.getStringPref("savepathmru."+i):null;
			ps.setStringPref("savepathmru."+i,prev);
			if (!old || (added == old)) break;
			prev=old;
		}
		return added;
	};
	
	AttachmentExtractor.prototype.useMRU=function(index) {
		aedump('{function:AttachmentExtractor.useMRU('+index+')}\n',2);
		var p = this.prefs.hasUserValue("savepathmru."+index) ? this.prefs.getFile("savepathmru."+index) : null;
		if (!p) return null;
		return this.addToMRUList(p);
	}
	
	AttachmentExtractor.prototype.clearMRU=function(max,min) {
		aedump('{function:AttachmentExtractor.clearMRU}\n',2);
		if (!min||min<1) min=1;
		if (!max||max>this.MRUMAXCOUNT) max=this.MRUMAXCOUNT;
		var ps=this.prefs.prefService.getBranch("extensions.attachmentextractor_cont.");
		for (var i=min;i<=max;i++) {
			if (ps.prefHasUserValue("savepathmru."+i)) ps.clearUserPref("savepathmru."+i);
		}
	};
	
	AttachmentExtractor.prototype.createaedumpfile = function () {
		
		function printPrefValues(includeDefault,excludereg) {
		  var branch=attachmentextractor.prefs.aeBranch;
		  var children=branch.getChildList("", {});
		  var out=null;
		  for (var i=0;i<children.length;i++) {
			if (!excludereg.test(children[i]) && 
				(includeDefault || branch.prefHasUserValue(children[i]))) {
				if (!out) out=""; else out+=", \r\n";
				var val;
				switch (branch.getPrefType(children[i])) {
					case branch.PREF_BOOL  : val= branch.getBoolPref(children[i]); break;
					case branch.PREF_INT   : val= branch.getIntPref(children[i]); break;
					case branch.PREF_STRING: val= '"'+branch.getCharPref(children[i])+'"'; break;
					default :
				}
				out+=children[i]+":"+val;
			}
		  }
		  return out;
		}
		
		try {
			aedebug.init(aedebugFile, 0x02 | 0x08 | 0x20, 0664, 0);
			var str="//log start \r\n";
			aedebug.write(str, str.length);
			
			/* following enabled by build script in xpi only: */			
			str = "AE Set Preferences: {\r\n"+printPrefValues(false,/.*\.[0-9]*$/i)+"}\r\n";
			aedebug.write(str, str.length);
			
			/* end */
			
			aedebug.close(); 
		}
		catch (e) {dump(e);}
	} 
	
	AttachmentExtractor.prototype.createaefolderListener = function() {
	return {
	  /*OnItemAdded: function(parentItem, item) {
		aedump("{function:aefolderlistener.OnItemAdded}\n",3);
		if (!attachmentextractor.prefs.get("autoextract")) return;
							   
		var mail;
		try{
			mail=item.QueryInterface(Components.interfaces.nsIMsgDBHdr);}
		catch (e) {return;}
		var folder=parentItem.QueryInterface(Components.interfaces.nsIMsgFolder); 
		if (!(!mail.isRead && (mail.flags & 0x10000))) {
			//aedump("// not a new mail so don't extract\n",3);
			return; 
		}
		aedump("{function:aefolderlistener.onItemAdded("+folder.prettyName+","+mail.subject+")}\n",2);
		if (!folder.getMsgDatabase(null).HasAttachments(mail.messageKey)) {
			aedump("// message has no attachments so ignoring.\n",3);
			return;
		}
		var tagsArray= mail.getStringProperty("keywords").split(" ");
		var triggerTag=attachmentextractor.prefs.get("autoextract.triggertag");
		//aedump("[tags array: "+mail.getStringProperty("keywords")+"]\n",0);
		//aedump("[trigger tag: "+attachmentextractor.prefs.get("autoextract.triggertag")+"]\n",0);
		if (attachmentextractor.prefs.get("autoextract.ontriggeronly") && (tagsArray.indexOf(triggerTag)==-1) ) {
			aedump("// only tagged emails and tag doesn't match\n",3);
			return;
		}
		if (attachmentextractor.prefs.get("autoextract.waitforall")) {
			attachmentextractor.autoUris.push(mail.folder.getUriForMsg(mail));
		}
		else attachmentextractor.doSingleBackgroundAttachmentextraction(mail.folder.getUriForMsg(mail));
	  },*/
	 
	  OnItemPropertyChanged: function(item, property, oldValue, newValue) {
		  //aedump("{function:aefolderlistener.onItemPropertyChanged}\n",3);
		  if (!attachmentextractor.prefs.get("autoextract.waitforall")) return;
		  var folder;
		  try {folder=item.QueryInterface(Components.interfaces.nsIMsgFolder); }catch (e) {return;}
		  aedump("{function:OnItemPropertyChanged("+folder.prettyName+","+property+oldValue+","+newValue+")}\n",2);
		  if (newValue>oldValue && attachmentextractor.autoMsgs.length!=0) {
			attachmentextractor.doBackgroundAttachmentextraction();  
		  }
	  },
	  
	  /*OnItemRemoved: function(parentItem, item) {
		if (!attachmentextractor.prefs.get("linkedfiles")) return;  
		
		var mail,folder;
		try{
			mail=item.QueryInterface(Components.interfaces.nsIMsgDBHdr);
			folder=parentItem.QueryInterface(Components.interfaces.nsIMsgFolder); 
		}catch (e) {return;}
		if (!folder.getFlag( 0x0100) ) return;
		aedump("{function:OnItemRemoved("+folder.prettyName+","+mail.subject+","+mail.folder.prettyName+")}\n",4);
		//if (mail.getStringProperty("AEMetaData.savedfiles")!="") attachmentextractor.deleteLinkedFile(mail);
	  },*/
	  
	  /*
	  OnItemIntPropertyChanged: function(item, property, oldValue, newValue) {aedump("{function:OnItemIntPropertyChanged("+argexpand(arguments)+")}\n",4);},
	  OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) {aedump("{function:OnItemBoolPropertyChanged("+argexpand(arguments)+")}\n",4);},
	  OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue){aedump("{function:OnItemUnicharPropertyChanged("+argexpand(arguments)+")}\n",4);},
	  OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) {aedump("{function:OnItemPropertyFlagChanged("+argexpand(arguments)+")}\n",4);},
	  OnItemEvent: function(folder, event) {aedump("{function:OnItemEvent("+argexpand(arguments)+")}\n",4);},  
	  */
	  
	  // new msg or folder added - tb2 only
	  itemAdded:function(item) {
		//aedump("{function:aefolderlistener.itemAdded}\n",3);
		var mail;
		try{
			mail=item.QueryInterface(Components.interfaces.nsIMsgDBHdr);}
		catch (e) {return;}
		this.msgAdded(mail);
	  },
	  
	  //tb3 only but called by itemAdded above.
	  msgAdded:function(mail) { 
		//aedump("{function:aefolderlistener.msgAdded}\n",3);
		var prefs=attachmentextractor.prefs;
		if (!prefs.get("autoextract")) return;
		
		if (!(!mail.isRead && (mail.flags & 0x10000))) {
			aedump("// not a new mail so don't extract\n",4);
			return; 
		}
		aedump("{function:aefolderlistener.msgAdded("+mail.folder.prettyName+","+mail.subject+")}\n",2);
		var msgdb;
		try{msgdb=(mail.folder.msgDatabase)? mail.folder.msgDatabase : mail.folder.getMsgDatabase(null);}
		catch (e) {msgdb=mail.folder.getDBFolderInfoAndDB(null);}
		if (prefs.get("autoextract.onattachmentsonly") && !msgdb.HasAttachments(mail.messageKey)) {
			aedump("// message has no attachments so ignoring.\n",3);
			return;
		}
		msgdb=null;
		var tagsArray= mail.getStringProperty("keywords").split(" ");
		var triggerTag=prefs.get("autoextract.triggertag");
		if (prefs.get("autoextract.ontriggeronly") && (tagsArray.indexOf(triggerTag)==-1) ) {
			aedump("// only tagged emails and tag doesn't match\n",3);
			return;
		}
		if (prefs.get("autoextract.waitforall")) {
			attachmentextractor.autoMsgs.push(mail);
		}
		else attachmentextractor.doSingleBackgroundAttachmentextraction(mail);
	  },
		
	  // folder or msg deleted (no trash)
	  itemDeleted:function(item) {
		/*if (!attachmentextractor.prefs.get("linkedfiles")) return;  
		
		var mail,folder;
		try{
			try{folder=item.QueryInterface(Components.interfaces.nsIMsgFolder); }catch (ee){}
			if (!folder) {
				mail=item.QueryInterface(Components.interfaces.nsIMsgDBHdr);
				folder=mail.folder; 
			}
		}catch (e) {aedump(e);aedump(item);return;}
		aedump("{function:itemDeleted("+folder.prettyName+")}\n",4);
		alert("test");*/
	  },
	  
	  itemMoveCopyCompleted:function(aMove,srcItems,destFolder) {},               
	  folderRenamed:function(aOrigFolder,aNewFolder){},
	  itemEvent:function(aItem,aEvent,aData){}
	};
  };
  
  AttachmentExtractor.prototype.prefObserver = {
    observe:function(subject ,topic , data) {
	  //aedump("// "+topic+","+data+"\n");
	  if (topic!="nsPref:changed") return;
	  if (data=="savepathmru"||data=="savepathmru.count") {
	    if (attachmentextractor.prefs.get("savepathmru")) {
		  attachmentextractor.clearMRU(attachmentextractor.MRUMAXCOUNT,attachmentextractor.prefs.get("savepathmru.count")+1); //clear any extra mru slots.
	    }
		return
	  }
	  if (data=="defaultsavepath" || data=="defaultsavepath.relative.key") {
		if (attachmentextractor.prefs.hasUserValue("defaultsavepath.relative.key")) {
		  var key=attachmentextractor.prefs.get("defaultsavepath.relative.key");
		  var dpf=attachmentextractor.prefs.getFile("defaultsavepath");
		  attachmentextractor.prefs.setRelFile("defaultsavepath.relative",dpf,key);
		}
		return;
	  }
	  if (data=="autoextract.savepath" || data=="autoextract.savepath.relative.key") {
		if (attachmentextractor.prefs.hasUserValue("autoextract.savepath.relative.key")) {
		  var key=attachmentextractor.prefs.get("autoextract.savepath.relative.key");
		  var dpf=attachmentextractor.prefs.getFile("autoextract.savepath");
		  attachmentextractor.prefs.setRelFile("autoextract.savepath.relative",dpf,key);
		}
		return;
	  }
    }
  };
}
/* *****  end of AttachmentExtractor Class Definition ****** */

if (!attachmentextractor) var attachmentextractor=new AttachmentExtractor();


// 