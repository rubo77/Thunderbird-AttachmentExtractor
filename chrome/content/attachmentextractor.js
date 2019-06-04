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
		this.OVERWRITEPOLICY_ASK=0;
		this.OVERWRITEPOLICY_REPLACE=1;
		this.OVERWRITEPOLICY_RENAME=2;
		this.OVERWRITEPOLICY_IGNORE=3;
		this.MRUMAXCOUNT=20;
		this.setupListenersDone=false;
		this.autoUris=new Array();
		
		/* services */
		this.strBundleService = (Cc["@mozilla.org/intl/stringbundle;1"].getService()).QueryInterface(Ci.nsIStringBundleService);
		this.promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
		
		/* bundles */
		this.aeStringBundle=this.strBundleService.createBundle("chrome://attachmentextractor/locale/attachmentextractor.properties");
		this.messengerStringBundle=this.strBundleService.createBundle("chrome://messenger/locale/messenger.properties");
	}
	
	AttachmentExtractor.prototype.init = function() {
		if (aedebug) this.createaedumpfile();
		this.convertPrefs();
		setTimeout(this.updatecheck,1000);
		
		this.checkForAutoTag();
		Cc["@mozilla.org/messenger/services/session;1"].getService(Ci.nsIMsgMailSession).
				AddFolderListener(aefolderListener, Ci.nsIFolderListener.propertyChanged  );
				/* Ci.nsIFolderListener.added + Ci.nsIFolderListener.removed Ci.nsIFolderListener.all */
		if (Ci.nsIMsgFolderNotificationService.msgAdded) Cc["@mozilla.org/messenger/msgnotificationservice;1"].
				getService(Ci.nsIMsgFolderNotificationService).addListener(aefolderListener,Ci.nsIMsgFolderNotificationService.msgAdded );  //tb3
		else Cc["@mozilla.org/messenger/msgnotificationservice;1"].
				getService(Ci.nsIMsgFolderNotificationService).addListener(aefolderListener); //tb2
	
		window.addEventListener('load', attachmentextractor.setupListeners, true);
		/*window.addEventListener('unload', attachmentextractor.unSetupListeners, true);  //unnessecary?*/
	
		this.prefs.aeBranch.QueryInterface(Ci.nsIPrefBranch2).addObserver("savepathmru", new AEPrefObserver(), false);
	};

	/* shortcut object to get & set ae's preferences.*/
	AttachmentExtractor.prototype.prefs= {
		aeBranch :Components.classes["@mozilla.org/preferences-service;1"].
						getService(Components.interfaces.nsIPrefService).getBranch('attachmentextractor.'),
		prefService:Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService),
		get:function(pref,branch) {
			var ps=(typeof branch == "undefined")?this.aeBranch:this.prefService.getBranch(branch);
	var type= ps.getPrefType(pref);
	if (type==ps.PREF_BOOL) return ps.getBoolPref(pref);
	if (type==ps.PREF_INT) return ps.getIntPref(pref);
	if (type==ps.PREF_STRING) return ps.getCharPref(pref);
	return null;
		},
		getComplex:function(pref,cci,branch) {
			return ((typeof branch == "undefined")?this.aeBranch:this.prefService.getBranch(branch)).getComplexValue(pref,cci);
		},			
		set:function(pref,value,branch) {
			var ps=(typeof branch == "undefined")?this.aeBranch:this.prefService.getBranch(branch);
	var type= ps.getPrefType(pref);
	if (type==ps.PREF_BOOL) return ps.setBoolPref(pref,value);
	if (type==ps.PREF_INT) return ps.setIntPref(pref,value);
	if (type==ps.PREF_STRING) return ps.setCharPref(pref,value);
	return null;
		},
		setComplex:function(pref,cci,value,branch) {
			return ((typeof branch == "undefined")?this.aeBranch:this.prefService.getBranch(branch)).setComplexValue(pref,cci,value);
		},			
		hasUserValue:function(pref,branch) {
			return ((typeof branch == "undefined")?this.aeBranch:this.prefService.getBranch(branch)).prefHasUserValue(pref);
		}			
	};

	/* access functions */

	AttachmentExtractor.prototype.doPatternAttachmentextraction = function(saveselect,all) {
	if (!all&&!GetSelectedMessages()) return;
		var fnp=this.getFilenamePattern();
	if (!fnp) return;
	this.doAttachmentextraction(saveselect,all,fnp);
	};

	// 
	AttachmentExtractor.prototype.doAttachmentextraction = function(saveselect,all,fnp){
	var folder=null;
	var deep=(all==2);
	saveselect=saveselect+"";
	//aedump("//ae: saveselect: "+saveselect+" all: "+all+"\n");
	switch (saveselect) {
			case "default": folder=this.getDefaultSaveFolder(); break;
			case "deleteAtt": this.startAttachmentextraction(null,(all)?this.collectMessagesFromFolder(deep):GetSelectedMessages(),null,false,true); break;
			case "0": folder=this.getSaveFolder("messenger.save.dir",true); if (folder) this.addToMRUList(folder); break;
			default : folder=this.useMRU(saveselect);
	}
		if (folder) this.startAttachmentextraction(folder,(all)?this.collectMessagesFromFolder(deep):GetSelectedMessages(),fnp,false,false);
	};

	AttachmentExtractor.prototype.doIndividualAttachmentextraction = function(saveselect,all,fnp){
	var folder;
	saveselect=saveselect+"";
	//aedump("//ae: saveselect: "+saveselect+" \n");
	switch (saveselect) {
			case "default": folder=this.getDefaultSaveFolder(); break;
			case "0": folder=this.getSaveFolder("messenger.save.dir",true); if (folder) this.addToMRUList(folder); break;
			default : folder=this.useMRU(saveselect);
	} 
		if (folder) this.startIndividualAttachmentextraction(folder,GetLoadedMessage(),(all)?currentAttachments:this.getSelectedAttachments(),fnp);
	};

	AttachmentExtractor.prototype.doBackgroundAttachmentextraction = function() {
		this.startAttachmentextraction(this.getAutoSaveFolder(),this.autoUris,null,true,false);
		this.autoUris=new Array();
	};

	AttachmentExtractor.prototype.doSingleBackgroundAttachmentextraction = function(uri) {
		this.startAttachmentextraction(this.getAutoSaveFolder(),[uri],null,true,false);
	};


	/* begining and ending functions */
	AttachmentExtractor.prototype.startAttachmentextraction = function(savefolder,messages,filenamepattern,background,deleteAtt) {
		if (this.prefs.get("queuerequests")) {
		// open up existing window and add items to task.
		var aew=progress_tracker.getWindowByType("mail:AEDialog");
		if (aew) {
			//aedump("// ** found aew and continuing ** \n");
				aew.aewindow.queuedTasks.push(new AETask(savefolder,messages,filenamepattern,aew.aewindow,gDBView,background,deleteAtt));		
			return;
		}
	}
		window.openDialog("chrome://attachmentextractor/content/aeDialog.xul",
				"_blank", "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar",
		savefolder,messages,filenamepattern,gDBView,background,deleteAtt);
	}; 

	AttachmentExtractor.prototype.startIndividualAttachmentextraction = function(savefolder,message,attachments,filenamepattern) {
	createAEIndTask(savefolder,message,attachments,filenamepattern);
	
	}; 
	
	/* anxillary functions */
	
	AttachmentExtractor.prototype.collectMessagesFromFolder=function(deep) {

		function getSimpleEnumerator(nsIEnum) {
			// makes a nsISimpleEnumerator from a nsIEnumerator
			return {
				hasMoreElements:function() {
					try{nsIEnum.currentItem();}catch(e) {return false;}
					return true;
				},
				getNext:function() {
					var c=nsIEnum.currentItem();
					try{ nsIEnum.next(); }catch (e){}
					return c;
				},
				QueryInterface:function(iid) {
					if (iid.equals(Ci.nsISimpleEnumerator) || iid.equals(Ci.nsISupports)) return this;
					throw Cr.NS_NOINTERFACE;
				}
			};			
		}
		
		function getAllMessages_sub(folder,msgs,deep) {
		  var enumr=folder.getMessages(msgWindow);
		  while (enumr.hasMoreElements()) {
			var msg=enumr.getNext().QueryInterface(Ci.nsIMsgDBHdr);
			if (msg) msgs.push(folder.generateMessageURI(msg.messageKey));
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

	var view = GetDBView();
	var treeView = view.QueryInterface(Ci.nsITreeView);
	var count = treeView.rowCount;
		var msgs=new Array(count);
	for (var i = 0; i < count; i++) {
			msgs[i]=view.getURIForViewIndex(i);
	}
	if (deep && view.msgFolder.hasSubFolders) {
			var enumr=(view.msgFolder.subFolders? view.msgFolder.subFolders : getSimpleEnumerator(view.msgFolder.GetSubFolders()));
		try {
			  while (enumr.hasMoreElements()) {
				getAllMessages_sub(enumr.getNext().QueryInterface(Ci.nsIMsgFolder),msgs,deep);
		  }
			} catch (e) {aedump("//ae: "+e+"\n",2);}			
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

	AttachmentExtractor.prototype.getSaveFolder=function(pref,updatepref) {
	var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
	var windowTitle = this.messengerStringBundle.GetStringFromName("SaveAttachment");
    try {
         fp.init(window, windowTitle, Ci.nsIFilePicker.modeGetFolder);
         try {
				var initialDir = this.prefs.hasUserValue(pref,"")? this.prefs.getComplex(pref, Ci.nsILocalFile,"") : null;
            if (initialDir) fp.displayDirectory = initialDir;
         } catch (e) {aedump(e,1);}
         var r = fp.show();
         if (r == Ci.nsIFilePicker.returnCancel) return false;
    } catch(e) {aedump(e,0);}
		if (updatepref) this.prefs.setComplex(pref, Ci.nsILocalFile,fp.file,"");
    return fp.file;
	};

	AttachmentExtractor.prototype.getDefaultSaveFolder=function() {
		if (this.prefs.hasUserValue("defaultsavepath")) {
			return this.prefs.getComplex("defaultsavepath", Ci.nsILocalFile);
	} 
		else if (this.prefs.get("browser.download.useDownloadDir","")&&
				 this.prefs.hasUserValue("browser.download.defaultFolder","")) {
			return this.prefs.get("browser.download.defaultFolder","");
		} 
		else return this.prefs.get("messenger.save.dir");
	};

	AttachmentExtractor.prototype.getAutoSaveFolder=function() {
		if (this.prefs.hasUserValue("autoextract.savepath")) {
			return this.prefs.getComplex("autoextract.savepath", Ci.nsILocalFile);
	}
		else return this.getDefaultSaveFolder();
	};

	AttachmentExtractor.prototype.getFilenamePattern=function() {
		//var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
		var input = {value: this.prefs.get("filenamepattern")};
	var check = {value: false};
		var out   = {value: false};
		// 		
		window.openDialog("chrome://attachmentextractor/content/filenamepattern.xul", "",
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

	/* check for newer version */
	AttachmentExtractor.prototype.updatecheck=function() {
	aedump("//ae: update check starting... ",2);
		var addon=Cc["@mozilla.org/extensions/manager;1"].getService(Ci.nsIExtensionManager).getItemForID("{35834d20-efdb-4f78-ab77-9635fb4e56c4}");
		if (attachmentextractor.prefs.get("firstuse")==addon.version) {
		aedump("ae not been updated so abort.\n",2);
		return;
	}
		else attachmentextractor.prefs.set("firstuse",addon.version);
	aedump("ae has been updated so set pref and show changelog.\n",2);
		
		var lang=attachmentextractor.prefs.get("general.useragent.locale","").substring(0,2);
		var url='http://www.eviljeff.com/extensionchecker.php?extension='+addon.name+'&version='+addon.version+'&lang='+lang;
	// 	
	window.openDialog("chrome://attachmentextractor/content/aefirstpopup.xul",
				"_blank", "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar",url);
	};

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
		attachmentextractor.checkForToolbarButton();
	try {
			document.getElementById('folderPaneContext').addEventListener('popupshowing',attachmentextractor.updateMRUVisability,false);
			document.getElementById('threadPaneContext').addEventListener('popupshowing',attachmentextractor.updateMRUVisability,false);
			document.getElementById('messageMenuPopup').addEventListener('popupshowing',attachmentextractor.updateMRUVisability,false);
			attachmentextractor.clearMRU(attachmentextractor.MRUMAXCOUNT,attachmentextractor.prefs.get("savepathmru.count")+1); //clear any extra mru slots.
			document.getElementById('folderTree').addEventListener('select', attachmentextractor.updateAECommands, false);
			document.getElementById('threadTree').addEventListener('select', attachmentextractor.updateAECommands, false);
	}
	catch(e){aedump("// setuplisteners failed.\n");}
		attachmentextractor.setupListenersDone=true;
	};

	AttachmentExtractor.prototype.updateAECommands=function() {
		//aedump('{function:AttachmentExtractor.updateAECommands}\n',2);
	var view = GetDBView();
	
		if (view) document.getElementById('ae_commandset_folder').removeAttribute('disabled');
		else 	  document.getElementById('ae_commandset_folder').setAttribute('disabled','true');		
		if (view && view.numSelected>0) document.getElementById('ae_commandset_msg').removeAttribute('disabled');
		else 							document.getElementById('ae_commandset_msg').setAttribute('disabled','true');
	};

	AttachmentExtractor.prototype.updateMRUVisability=function(event) {
		/*aedump('{function:AttachmentExtractor.updateMRUVisability}\n',2);*/
		var mru=attachmentextractor.prefs.get("savepathmru");
	
	var children = event.target.childNodes;
	var chattr;
    for (var i=0;i<children.length;i++) {
		if (!children[i]) continue;
		chattr=children[i].getAttribute("ae_mru_menuitem");
		if ((mru && chattr=="MRU") ||
			(!mru&& chattr=="NONMRU") ) {
			children[i].removeAttribute('hidden');
		}
			else if ((mru && chattr=="NONMRU") ||
			(!mru&& chattr=="MRU") ) {
			children[i].setAttribute('hidden',true);
		}
	}
	};

	AttachmentExtractor.prototype.updateMRUList=function(parent) {
		var ps=attachmentextractor.prefs.prefService.getBranch("attachmentextractor.");
	if (!ps.getBoolPref("savepathmru")) return;
	
	var children = parent.childNodes;
		var oncommand="attachmentextractor.do"+
					  ((parent.getAttribute("paramIndividual")=="true")?"Individual":"")+
					  ((parent.getAttribute("paramPattern")=="true")?"Pattern":"")+
					  "Attachmentextraction('#',"+parent.getAttribute("paramAll")+");"
	
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
			var pv=(ps.prefHasUserValue("savepathmru."+i))?ps.getComplexValue("savepathmru."+i,Ci.nsILocalFile).path:null;
			if (!pv || pv=="") pv="< ... >";
			if (i<10) pv="("+i+") "+pv;
			menuitem.setAttribute('label',pv);
		}
    	parent.appendChild( menuitem );
	}
	};
	
	AttachmentExtractor.prototype.onShowAttachmentContextMenu2=function(event) {
		//aedump('{function:AttachmentExtractor.onShowAttachmentContextMenu2}\n',2);
		var attachmentList = document.getElementById('attachmentList');
	
		var canOpen = false;
		if (document.getElementById('context-saveAttachment').getAttribute('disabled')!="true") {
			for (var i = 0; i < attachmentList.selectedItems.length && !canOpen; i++) {
				canOpen = !attachmentList.selectedItems[i].attachment.isExternalAttachment;
				//aedump(" * "+attachmentList.selectedItems[i].attachment.isExternalAttachment);
			} //aedump(" post: "+canOpen+" | "+attachmentList.selectedItems.length+"\n");
		} //aedump("//canOpen: "+canOpen+"\n");  
		if (canOpen) document.getElementById('ae_commandset_ind').removeAttribute('disabled');
		else 		 document.getElementById('ae_commandset_ind').setAttribute('disabled',"true");
	
		attachmentextractor.updateMRUVisability(event);
	};

	AttachmentExtractor.prototype.addToMRUList=function(added) {
		var ps=this.prefs.aeBranch;  
	if (!ps.getBoolPref("savepathmru")) return added;
	var count=ps.getIntPref("savepathmru.count");
	var old=(ps.prefHasUserValue("savepathmru.1"))?ps.getComplexValue("savepathmru.1",Ci.nsILocalFile):null;
	if (old&&added.equals(old)) return added;
	ps.setComplexValue("savepathmru.1",Ci.nsILocalFile,added);
	if (!old) return added;
	var prev=old;
	var i=2;
	for (;i<=count;i++) {
		old=(ps.prefHasUserValue("savepathmru."+i))?ps.getComplexValue("savepathmru."+i,Ci.nsILocalFile):null;
		ps.setComplexValue("savepathmru."+i,Ci.nsILocalFile,prev);
		if (!old || added.equals(old)) break;
		prev=old;
	}
	return added;
	};

	AttachmentExtractor.prototype.useMRU=function(index) {
		var ps=this.prefs.prefService.getBranch("attachmentextractor.");
	var p= (ps.prefHasUserValue("savepathmru."+index))? ps.getComplexValue("savepathmru."+index,Ci.nsILocalFile) : null;
	if (!p) return null;
		return this.addToMRUList(p);
	}

	AttachmentExtractor.prototype.clearMRU=function(max,min) {
	if (!min||min<1) min=1;
		if (!max||max>this.MRUMAXCOUNT) max=this.MRUMAXCOUNT;
		var ps=this.prefs.prefService.getBranch("attachmentextractor.");
	for (var i=min;i<=max;i++) {
		if (ps.prefHasUserValue("savepathmru."+i)) ps.clearUserPref("savepathmru."+i);
	}
	};

	AttachmentExtractor.prototype.checkForToolbarButton=function() {
		aedump('{function:AttachmentExtractor.checkForToolbarButton}\n',2);
	
	var mainToolbar = document.getElementById("mail-bar2");
		if (this.prefs.get("firstuse.toolbarbutton")) {
		//aedump("//ae: toolbar button existence already checked.\n",3);
		return; //already checked for existence of button. Don't hassle the user any more.
	}
	if (mainToolbar.currentSet.indexOf("attachmentextractor-toolbarbutton") == -1) {
		mainToolbar.insertItem("attachmentextractor-toolbarbutton", document.getElementById('button-delete'), null, false);
		mainToolbar.setAttribute("currentset",mainToolbar.currentSet);
        document.persist("mail-bar2", "currentset");
		} 
		else aedump("//ae: user has already added the toolbar button.\n",3);
		this.prefs.set("firstuse.toolbarbutton",true);
	} 

	AttachmentExtractor.prototype.addHeaderButton=function() {
		if (document.getElementById("aeHdrButton")) return;
		var junk=document.getElementById("expandedButtonBox");
		if (junk) junk=junk.getButton('hdrJunkButton');
		else return;
		var aeHdrButton=document.createElement( "button" );
		aeHdrButton.setAttribute('id',"aeHdrButton");
	    aeHdrButton.setAttribute('class',"msgHeaderView-button hdrAEButton");
		aeHdrButton.setAttribute('ae',"true");
		/*aeHdrButton.setAttribute('tooltiptext',"&attachmentextractor.toolbarbutton.tooltip2;");*/
		aeHdrButton.setAttribute('command',"cmd_ae_extractToDefault");
		junk.parentNode.appendChild(aeHdrButton);
		junk=document.getElementById("collapsedButtonBox").getButton('hdrJunkButton');
		junk.parentNode.appendChild(aeHdrButton.cloneNode(false));
	}
	
	AttachmentExtractor.prototype.convertPrefs=function()  {
		var pb=this.prefs.prefService.getBranch("attachmentextractor.");
	if (pb.prefHasUserValue("includepatterns")) {
		var newpattern=(pb.getCharPref("includepatterns")=="")? "" : "*."+pb.getCharPref("includepatterns").split(',').join(';*.');
		pb.setCharPref("includepatterns4",newpattern);
		pb.clearUserPref("includepatterns");
	} 
	if (pb.prefHasUserValue("includepatterns2")) {
		var newpattern=pb.getCharPref("includepatterns2").replace(",",";","g");
		pb.setCharPref("includepatterns4",newpattern);
		pb.clearUserPref("includepatterns2");
	}
	if (pb.prefHasUserValue("includepatterns3")) {
		var patterns=pb.getCharPref("includepatterns3").split(';');
		for (var i=0;i++;i<patterns.length) if (patterns[i].indexOf("*")==-1) patterns[i]="*"+patterns[i];
		pb.setCharPref("includepatterns4",patterns.join(";"));
		pb.clearUserPref("includepatterns3");
	}
	if (pb.prefHasUserValue("excludepatterns")) {
		var newpattern=(pb.getCharPref("excludepatterns")=="")? "" : "*."+pb.getCharPref("excludepatterns").split(',').join(';*.');
		pb.setCharPref("excludepatterns4",newpattern);
		pb.clearUserPref("excludepatterns");
	} 
	if (pb.prefHasUserValue("excludepatterns2")) {
		var newpattern=pb.getCharPref("excludepatterns2").replace(",",";","g");
		pb.setCharPref("excludepatterns4",newpattern);
		pb.clearUserPref("excludepatterns2");
	}
	if (pb.prefHasUserValue("excludepatterns3")) {
		var patterns=pb.getCharPref("excludepatterns3").split(';');
		for (var i=0;i++;i<patterns.length) if (patterns[i].indexOf("*")==-1) patterns[i]="*"+patterns[i];
		pb.setCharPref("excludepatterns4",patterns.join(";"));
		pb.clearUserPref("excludepatterns3");
	}
	if (pb.prefHasUserValue("aedetacher")) {
		if (pb.getBoolPref("aedetacher")) {
			pb.setIntPref("actionafterextract.detach.mode",(!pb.prefHasUserValue("aedetacher.delete"))?1:2);
		}
		pb.clearUserPref("aedetacher");	
	}
	if (pb.prefHasUserValue("extract")) {
		if (!pb.getBoolPref("extract")) {
			pb.setIntPref("extract.mode",-1);
		}
		pb.clearUserPref("extract");	
	}

		// 
	};
	
	// 		
	
	AttachmentExtractor.prototype.createaedumpfile = function () {
		
		function printPrefValues(includeDefault,includereg) {
		  var branch=attachmentextractor.prefs.aeBranch;
		  var children=branch.getChildList("", {});
		  var out=null;
		  for (var i=0;i<children.length;i++) {
			if (includereg.test(children[i]) && 
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
			str = "AE Set Preferences: {"+printPrefValues(false,/.*(patterns4$|[^0-9]$)/i)+"}\r\n";
			aedebug.write(str, str.length);
			 /* end */
			
			aedebug.close(); 
		}
		catch(e) {dump(e);}
	} 
}
/* *****  end of AttachmentExtractor Class Definition ****** */


// 
if (!attachmentextractor) var attachmentextractor=new AttachmentExtractor();

var aefolderListener = {
 
  OnItemPropertyChanged: function(item, property, oldValue, newValue) {
	  //aedump("{function:aefolderlistener.onItemPropertyChanged}\n",3);
	  if (!attachmentextractor.prefs.get("autoextract.waitforall")) return;
	  var folder;
	  try {folder=item.QueryInterface(Components.interfaces.nsIMsgFolder); }catch(e) {return;}
	  aedump("{function:OnItemPropertyChanged("+folder.prettyName+","+property+oldValue+","+newValue+")}\n",2);
	  if (newValue>oldValue && attachmentextractor.autoUris.length!=0) {
		attachmentextractor.doBackgroundAttachmentextraction();  
	  }
  },
  
  
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
    if (!attachmentextractor.prefs.get("autoextract")) return;
	
	if (!(!mail.isRead && (mail.flags & 0x10000))) {
		aedump("// not a new mail so don't extract\n",4);
		return; 
	}
	aedump("{function:aefolderlistener.msgAdded("+mail.folder.prettyName+","+mail.subject+")}\n",2);
	if (!mail.folder.getMsgDatabase(null).HasAttachments(mail.messageKey)) {
		aedump("// message has no attachments so ignoring.\n",3);
		return;
	}
	var tagsArray= mail.getStringProperty("keywords").split(" ");
	var triggerTag=attachmentextractor.prefs.get("autoextract.triggertag");
	if (attachmentextractor.prefs.get("autoextract.ontriggeronly") && (tagsArray.indexOf(triggerTag)==-1) ) {
		aedump("// only tagged emails and tag doesn't match\n",3);
		return;
	}
	if (attachmentextractor.prefs.get("autoextract.waitforall")) {
		attachmentextractor.autoUris.push(mail.folder.getUriForMsg(mail));
	}
	else attachmentextractor.doSingleBackgroundAttachmentextraction(mail.folder.getUriForMsg(mail));
  },
  
  itemMoveCopyCompleted:function(aMove,srcItems,destFolder) {},               
  folderRenamed:function(aOrigFolder,aNewFolder){},
  itemEvent:function(aItem,aEvent,aData){}
}

function AEPrefObserver() {
  this.observe=function(subject ,topic , data) {
	//aedump("// "+topic+","+data+"\n");
	if (topic!="nsPref:changed") return;
	if (data=="attachmentextractor.savepathmru"||data=="attachmentextractor.savepathmru.count") {
	  if (attachmentextractor.prefs.get("savepathmru")) {
		attachmentextractor.clearMRU(attachmentextractor.MRUMAXCOUNT,attachmentextractor.prefs.get("savepathmru.count")+1); //clear any extra mru slots.
	  }
	}
  }

  /* should support all interfaces we support */
  this.QueryInterface= function (iid)
  {
    if (iid.equals(Components.interfaces.nsIObserver) ||
        iid.equals(Components.interfaces.nsISupports))
      return this;
    throw Components.results.NS_NOINTERFACE;
  };
}

// 
var aedebug=false;
var aedebugFile=null;
try{
	aedebug=Components.classes["@mozilla.org/preferences-service;1"].
		getService(Components.interfaces.nsIPrefBranch).getBoolPref("attachmentextractor.debug");
	if (aedebug) {
		aedebug= Components.classes['@mozilla.org/network/file-output-stream;1'].
						createInstance(Components.interfaces.nsIFileOutputStream);
		aedebugFile=Components.classes["@mozilla.org/file/directory_service;1"].
						getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
		aedebugFile.append('aedebug.txt');
	}
}catch (e) {}

var argexpand = (aedebug)? function (args) {
	var str="";
	for(var i=0;i<args.length;i++) {
		if (i>0) str+=",";
		str+=args[i]+"";
	}
	return str;
} : function () {return "";};

var aedump = (aedebug)? function (){
	var loglevel=4;
	
	var errorlevel=(arguments.length>1)?arguments[1]:0;
	if (errorlevel<=loglevel) {
		try{ 
			var str=(arguments[0]+"").replace(/\n/g,"\r\n");
			aedebug.init(aedebugFile, 0x02 | 0x10, 0664, 0);
			aedebug.write(str, str.length);
			aedebug.close(); 
		} catch(e) {dump("!NOT LOGGED: ");}
		dump(arguments[0]);
	}
} : function () {};

		
