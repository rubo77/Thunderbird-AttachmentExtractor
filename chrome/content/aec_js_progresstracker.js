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
 
var progress_tracker = {
	/* variables */
	message_states: {IDLE:0,LOADING:10,SAVING:20,TIDYING:25,MARKREAD:30,SAVEMESSAGE:35,CLEARTAG:40,DETACH:50,DELTEMPFILE:52,SAVEMETADATA:59,DELETE:60},
	state: 0,
	last_message_index: -1,
	pwindow:null,
	reportgen:null,
	statusFeedback:null,
	
	/* access functions */
	starting_extraction : function () {
		this.debug("{function:progress_tracker.starting_extraction}\n");
		if (aewindow.prefs.get("reportgen") && aewindow.currentTask.isExtractEnabled) {
			try{
				this.reportgen=new AE_Reportgen();
			} catch (ee) {
		  		aedump('//ae: tried creating reportgen, but failed, aborting report\n');
			}
			if (this.reportgen) this.reportgen.start_write();
		}
		this.pwindow=this.getWindowByType("mail:AEDialog");
		if (this.pwindow) {
			this.pwindow.toggleText(aewindow.prefs.get("progressdialog.showtext"));
			this.pwindow.setupFileProgress();	
		}
		this.set_status_text("StatusTextStarting");
	},
	
	ended_extraction : function () {
		this.debug("{function:progress_tracker.ended_extraction}\n");
		if (this.reportgen) this.reportgen.end_write();
		this.set_status_text("StatusTextEnded");
	},
	
	starting_message : function(message_index,length) {
		this.state=this.message_states.LOADING;
		this.last_message_index=message_index;
		this.debug("{function:progress_tracker.starting_message("+message_index+")}\n");
		if (this.reportgen) this.reportgen.start_message(message_index,length);
		if (!this.pwindow) return;
		this.pwindow.updateCounts(message_index,length,-1,-1);
		if (aewindow.prefs.get("progressdialog.showtext")) {
			this.pwindow.updateSubject(aewindow.currentTask.getMessageHeader().subject);
		}		
	},
	stopping_message : function(message_index) {
		this.debug("{function:progress_tracker.stopping_message("+message_index+")}\n");
		this.state=this.message_states.IDLE;
		this.last_message_index=message_index;
	},
	
	starting_attachment : function(attachment_index,length) {
		this.state=this.message_states.SAVING;
		this.debug("{function:progress_tracker.starting_attachment("+attachment_index+")}\n");
		if (this.pwindow) {
		  this.pwindow.updateCounts(-1,-1,attachment_index,length);
		  if (aewindow.prefs.get("progressdialog.showtext")) {
			this.pwindow.updateFilename(aewindow.currentTask.currentMessage.getAttachment(attachment_index).displayName);
		  }
		}
		this.set_status_text("StatusTextAttachment",[(attachment_index+1),length]);
	},
	stopping_attachment : function(attachment_index) {
		this.debug("{function:progress_tracker.stopping_attachment("+attachment_index+")}\n");
		this.state=this.message_states.TIDYING;
		this.set_file_progress(-1,-1);
		if (this.reportgen) this.reportgen.end_attachment(attachment_index);
		this.set_status_text("StatusTextTidying",[(attachment_index+1)]);
	},
	
	reset_tracker : function() {
		this.state=this.message_states.IDLE;
		this.last_message_index=-1;
	},
	
	get is_detaching() {return (this.state==this.message_states.DETACH);},
	
	starting_markread : function () {
		this.state=this.message_states.MARKREAD;
	},
	
	get attachment_busy() {return (this.state==this.message_states.SAVING);},	

	windowManager:Components.classes['@mozilla.org/appshell/window-mediator;1'].getService().QueryInterface(Components.interfaces.nsIWindowMediator),
	    	
	getWindowByType : function (type) {
		return this.windowManager.getMostRecentWindow(type);
	},
	
	set_status_text: function(entry,param) {
	  try{
		if (this.statusFeedback && entry && entry!="") {
			var txt=(param)?aewindow.aeStringBundle.formatStringFromName(entry,param,param.length):
							aewindow.aeStringBundle.GetStringFromName(entry);
			this.statusFeedback.showStatusString(txt);
		}
	  }catch (e) {aedump(e);}
	},
	
	set_file_progress: function(value,maxv) {
		if (this.pwindow&&this.pwindow.updateFileProgress) this.pwindow.updateFileProgress(value,maxv); 
	},
	
	/*
	toOpenWindowByType : function (type, uri) {
    	var topWindow = this.getWindowByType(type);
		if (topWindow) topWindow.focus();
		else return window.open(uri, "_blank", "chrome,extrachrome,menubar,resizable,scrollbars,status,toolbar");
		return topWindow;
	},

	toCloseWindowByType : function(type) {
		var topWindow=this.getWindowByType(type);
		if ( topWindow ) topWindow.close();
		//else aedump ('"'+type+'" not found');
	},
	*/
	
	debug: aedump
}

function AE_Reportgen() {
  var prefs = aewindow.prefs ;
  var Cc=Components.classes;
  var Ci=Components.interfaces;
  var Cr=Components.results;
  
  var aerg_document;
  var aerg_currentmessage;
  var reportFile=aewindow.fileObject;
  var absolutereport=false;
  try {
	  reportFile.initWithFile(aewindow.currentTask.filemaker.destFolder);
  	  reportFile.append(prefs.get("reportgen.reportname"));
  }catch (e) {
	  // if we can't append the filename then maybe its a full path. Give that a try.
	  reportFile.initWithPath(prefs.get("reportgen.reportname"));
	  absolutereport=true;
  }
	
  var strBundle=aewindow.strBundleService.createBundle("chrome://attachmentextractor_cont/locale/attachmentextractor-reportgen.properties");
  var fileHandler = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService).getProtocolHandler("file")
                     .QueryInterface(Ci.nsIFileProtocolHandler);
	
  this.start_write=start_write;
  this.end_write=end_write;
  this.start_message=start_message;
  this.end_attachment=end_attachment;
  
  function get_bodyElem() {
	var bodyElem = aerg_document.getElementsByTagName("body");
	return (bodyElem&&bodyElem.length>0)?bodyElem[0]:null;
  };

  function start_write() {
	if (prefs.get("reportgen.append") && reportFile.exists()&& reportFile.isReadable()) load_oldreport();
	else create_newreport();
	var bodyElem=get_bodyElem();
	var hrdiv_elem=aerg_document.createElement("div");
	var h6=aerg_document.createElement("h6");
	h6.appendChild(aerg_document.createTextNode(strBundle.formatStringFromName("ExtractionStarted",[new Date()],1)));
	hrdiv_elem.appendChild(h6);
	//hrdiv_elem.appendChild(aerg_document.createElement("hr"));
	bodyElem.appendChild(hrdiv_elem);
  };

  function load_oldreport() {
	try {
		var inputStream = Cc['@mozilla.org/network/file-input-stream;1'].createInstance(Ci.nsIFileInputStream);
		var repurl=fileHandler.newFileURI(reportFile);
		aedump(repurl);
		var parser = new DOMParser(null,repurl);
		inputStream.init(reportFile, 1, 0, false);
		aerg_document=parser.parseFromStream(inputStream,null,-1,"text/xml");
		inputStream.close();
		if (get_bodyElem()==null) throw new Error("empty or invalid existing report file");
	} 
	catch (e) {
		aedump(e);
		create_newreport();
		return;
	}
	var newStyleElem=makeScriptSection();
	if (newStyleElem) {
	  var oldStyleElem=aerg_document.getElementsByTagName("style");
	  if (oldStyleElem &&oldStyleElem[0]) {
		oldStyleElem=oldStyleElem[0];
		oldStyleElem.parentNode.replaceChild(oldStyleElem,newStyleElem);
	  } else{
		var headElem=aerg_document.getElementsByTagName("head");
		headElem=headElem[0];
		headElem.appendChild(newStyleElem);
	  }
	}
  }

  function create_newreport() {
	aerg_document = document.implementation.createDocument("http://www.w3.org/1999/xhtml","html",null);
	var headElem = aerg_document.createElement("head");
	var titleElem = aerg_document.createElement("title");
	titleElem.appendChild(aerg_document.createTextNode(strBundle.GetStringFromName("ReportTitle")));
	headElem.appendChild(titleElem);
	
	var styleElem=makeScriptSection();
	if (styleElem) headElem.appendChild(styleElem);
	aerg_document.documentElement.appendChild(headElem);
	 
	var bodyElem = aerg_document.createElement("body");
	var h1=aerg_document.createElement("h2");
	h1.appendChild(aerg_document.createTextNode(strBundle.GetStringFromName("Heading")+":"));
	bodyElem.appendChild(h1);
	bodyElem.appendChild(aerg_document.createElement("hr"));
	aerg_document.documentElement.appendChild(bodyElem);
  }
  
  function makeScriptSection() {
	var fileIn;
	try{
		fileIn=prefs.getFile("reportgen.cssfile");
	}catch (e) {}
	if (!fileIn) return null;
	var styleElem;
	if(prefs.get("reportgen.embedcss")) {
		styleElem= aerg_document.createElement("style");
		var css=" ";
		if (fileIn && fileIn.exists()) {
			try {
				var inputStream = Cc['@mozilla.org/network/file-input-stream;1'].createInstance(Ci.nsIFileInputStream);
				var scriptableStream = Cc['@mozilla.org/scriptableinputstream;1'].createInstance(Ci.nsIScriptableInputStream);
				inputStream.init(file, 1, 0, false);
				scriptableStream.init(inputStream);
				css=scriptableStream.read(-1);
				scriptableStream.close();
				inputStream.close();
			} 
			catch (e) {aedump(e);}
			styleElem.appendChild(aerg_document.createTextNode(css));
		}
	}
	else {
		styleElem= aerg_document.createElement("link");
		styleElem.setAttribute("REL","stylesheet")
		styleElem.setAttribute("HREF",fileHandler.getURLSpecFromFile(fileIn));
		styleElem.setAttribute("TITLE","Style");
	}
	styleElem.setAttribute("TYPE","text/css");
	return styleElem;
  }
  
  function end_write() {
	var bodyElem=get_bodyElem();
	var hrdiv_elem=aerg_document.createElement("div");
	var hr=aerg_document.createElement("hr");
	hr.setAttribute("style","visibility:hidden");
	hrdiv_elem.appendChild(hr);
	var h6=aerg_document.createElement("h6");
	h6.appendChild(aerg_document.createTextNode(strBundle.formatStringFromName("ExtractionEnded",[new Date()],1)));
	hrdiv_elem.appendChild(h6);
	hrdiv_elem.appendChild(aerg_document.createElement("hr"));
	hrdiv_elem.setAttribute("style","clear:both");
	bodyElem.appendChild(hrdiv_elem);
	
	var serializer = new XMLSerializer();
	var foStream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
	
	try{
		foStream.init(reportFile, 0x02 | 0x08 | 0x20, 0664, 0);   
		serializer.serializeToStream(aerg_document, foStream, "");  
		foStream.close();	
	}catch (e) {aedump('//ae: error when writing report: '+e+'\n');}
  };

  function start_message() {
	aerg_currentmessage=aerg_document.createElement("div");
	aerg_currentmessage.setAttribute("class","email");
	aerg_currentmessage.setAttribute("style","clear:both");
	var heading= aerg_document.createElement("h3");
	heading.setAttribute("class","email");
	var subject = "";
	var datetime = "";
	var to = "";
	var from = "";
	try {
		var msheader= aewindow.currentTask.getMessageHeader();
		subject = msheader.mime2DecodedSubject;
		datetime = new Date(msheader.dateInSeconds*1000);
		to = msheader.mime2DecodedRecipients ;
		from = msheader.mime2DecodedAuthor;
	}catch (e) {}
	
	heading.appendChild(aerg_document.createTextNode(strBundle.GetStringFromName("Subject")+": "+subject));
	aerg_currentmessage.appendChild(heading);
	aerg_currentmessage.appendChild(aerg_document.createTextNode(strBundle.GetStringFromName("From")+": "+from));
	aerg_currentmessage.appendChild(aerg_document.createElement("br"));
	aerg_currentmessage.appendChild(aerg_document.createTextNode(strBundle.GetStringFromName("DateTime")+": "+datetime));
	aerg_currentmessage.appendChild(aerg_document.createElement("br"));
	aerg_currentmessage.appendChild(aerg_document.createTextNode(strBundle.GetStringFromName("To")+": "+to));
	aerg_currentmessage.appendChild(aerg_document.createElement("br"));
	get_bodyElem().appendChild(aerg_currentmessage);	
  };

  function imagetype_check(mimetype) {
	var imagemime="image/";
	return (mimetype.substr(0,imagemime.length)==imagemime);
	
  };

  function end_attachment() {
	//dump("{*start attachment*{"+arguments+"}*length("+arguments.length+")*}\n");
	var d1=parseInt(arguments[0]);
	//dump("{*start attachment[0]*{"+d1+"}**}\n");
	var savedFile=aewindow.currentMessage.attachments_savedfile[d1];
	if (!savedFile) return;
	var savedAppendage=aewindow.currentMessage.attachments_appendage[d1];
	var filename=(absolutereport)?fileHandler.getURLSpecFromFile(savedFile):encodeURIComponent(savedAppendage);
	
	var thumbnail=prefs.get("reportgen.thumbnail");
	if (thumbnail) thumbnail=imagetype_check(aewindow.currentMessage.attachments_ct[d1]);
	
	var att_elem=aerg_document.createElement("div");
	att_elem.setAttribute("class","attachment");
	var link_elem=aerg_document.createElement("a");
	link_elem.setAttribute("href",filename);
	link_elem.setAttribute("class","attachment");
	if (thumbnail) {
		var thumb_elem=aerg_document.createElement("img");
		thumb_elem.setAttribute("class","attachment");
		thumb_elem.setAttribute("src",filename);
		thumb_elem.setAttribute("alt",savedAppendage+"; ");
		thumb_elem.setAttribute("title",savedAppendage);
		thumb_elem.setAttribute("height","100");
		att_elem.setAttribute("style","float:left");
		link_elem.appendChild(thumb_elem);
	}
	else {
		link_elem.appendChild(aerg_document.createTextNode(savedAppendage));
	}
	att_elem.appendChild(link_elem);
	aerg_currentmessage.appendChild(att_elem);
  };	
  
}
