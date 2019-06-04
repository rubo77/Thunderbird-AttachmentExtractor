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

function syncFromFilePref(pref) {
	var prefName=(pref.getAttribute)?pref.getAttribute("preference"):pref;
	var prefval=document.getElementById(prefName);
	if (prefval && prefval.value && prefval.value.path) return prefval.value.path;
	return "";
}

/*function syncToFilePref(this) {
	var pref=document.getElementById(this.getAttribute("preference"));
	var prefval=document.getElementById(pref);
	if (prefval && prefval.value && prefval.value.path) return prefval.value.path;
}*/
	
function enableField(aCheckbox, fieldID) { 
    var field=null;
	if (fieldID instanceof Array) {
		if (fieldID.length>0) field= document.getElementById(fieldID.shift());
	} else field = document.getElementById(fieldID);
	if (!field) return;
    if ((aCheckbox.localName == "radio" && aCheckbox.selected)||(aCheckbox.localName == "checkbox" && aCheckbox.checked)) {
	    if (field.localName=="radiogroup") field.disabled=false;
		field.removeAttribute("disabled"); 
	}
    else {
         if (field.localName=="radiogroup") field.disabled=true;
		 field.setAttribute("disabled", "true"); 
	}
	if (fieldID instanceof Array) enableField(aCheckbox, fieldID);
}
	
function browseForFolder(pref_el_id) {
	var Cc=Components.classes;
	var Ci=Components.interfaces;
	var pref=document.getElementById(pref_el_id);
	var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
	var windowTitle = document.getElementById("aestrbundle").getString("FolderPickerDialogTitle");
    try {
		fp.init(window, windowTitle, Ci.nsIFilePicker.modeGetFolder);
		try {
			if (pref.value) fp.displayDirectory = pref.value;
		} catch (e) {aedump(e,1);}
		fp.open(r => {
			if (r != Ci.nsIFilePicker.returnOK || !fp.file) {
		    	return;
		    }
			pref.value=fp.file;
		});
	} catch (e) {aedump(e,0);}
}

function browseForExecutable(pref_el_id) {
	var Cc=Components.classes;
	var Ci=Components.interfaces;
	var pref=document.getElementById(pref_el_id);
	var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
	var windowTitle = document.getElementById("aestrbundle").getString("ExecutableFilePickerDialogTitle");
    try {
        fp.init(window, windowTitle, Ci.nsIFilePicker.modeOpen);
		fp.appendFilters(Ci.nsIFilePicker.filterApps || Ci.nsIFilePicker.filterAll )
        try {
        	if (pref.value) fp.displayDirectory = pref.value.parent;
        } catch (e) {aedump(e,1);}
		fp.open(r => {
			if (r != Ci.nsIFilePicker.returnOK || !fp.file) {
		    	return;
		    }
			pref.value=fp.file ;
		});
    } catch (e) {aedump(e,0);}
}

function browseForCss(pref_el_id) {
	var Cc=Components.classes;
	var Ci=Components.interfaces;
	var pref=document.getElementById(pref_el_id);
	var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
	var windowTitle = document.getElementById("aestrbundle").getString("CSSFilePickerDialogTitle");
	try {
        fp.init(window, windowTitle, Ci.nsIFilePicker.modeOpen);
        fp.appendFilter(document.getElementById("aestrbundle").getString("CSSFileFilterDescription"),"*.css"); 
		try {
        	if (pref.value) fp.displayDirectory = pref.value.parent;
        } catch (e) {dump(e);}
		fp.open(r => {
			if (r != Ci.nsIFilePicker.returnOK || !fp.file) {
		    	return;
		    }
			pref.value=fp.file;
		});
    } catch (e) {dump(e);}
}

function showDetachWarning(radiobox) {
	if (!radiobox.selected) return;
	var amessage=document.getElementById("aestrbundle").getString("ConfirmDetachSettingDialogMessage");
	alert(amessage);
}

function showReturnReceiptSettings() {
	document.documentElement.openSubDialog("chrome://attachmentextractor_cont/content/settings/aec_prefs_post_receipt.xul","", null);
}

function showSuggestFolderSettings() {
	document.documentElement.openSubDialog("chrome://attachmentextractor_cont/content/settings/aec_prefs_general_suggest.xul","", null);
}

function showReportSettings() {
	document.documentElement.openSubDialog("chrome://attachmentextractor_cont/content/settings/aec_prefs_post_report.xul","", null);
}

function showDateSettings() {
	document.documentElement.openSubDialog("chrome://attachmentextractor_cont/content/settings/aec_prefs_filename_date.xul","", null);

}

function appendPrefEntry(listbox,prefid,emptytext) {
	var entry=listbox.appendItem(".",prefid);
	var tb2idfix=listbox.itemCount? null:listbox.id+listbox.childNodes.length;  //bloody tb2 ! "this" doesnt resolve properly within onsyncfrompreference in tb2 so workaround.
	entry.setAttribute("preference",prefid);
	if (tb2idfix) entry.setAttribute("id",tb2idfix);
	entry.setAttribute("onsyncfrompreference","var l=syncFromFilePref('"+prefid+"');"+(tb2idfix?"document.getElementById('"+tb2idfix+"')":"this")+".setAttribute('label',(l==''?'"+emptytext+"':l))");
	return entry;
}

function fillParentFolderList(folderlist) {
	//aedump(folderlist.nodeName+",");
	if (folderlist.childNodes.length!=0) return;
	var emptytext=document.getElementById("aestrbundle").getString("EmptyLineText");
	var prefid=folderlist.getAttribute("preference");
	//aedump(prefid+"\n");
	var pref=document.getElementById(prefid);
	if (pref && pref.name) {
		for (var i=1;i<=100;i++) {
		  var entryid=prefid+"_"+i;
		  if (!document.getElementById(entryid)) {
			var newpref=document.createElement("preference");
			newpref.setAttribute("id",entryid);
			newpref.setAttribute("name",pref.name+"."+i);
			newpref.setAttribute("type","file");
			/*newpref.setAttribute("onchange","removeBlanks(document.getElementById('"+folderlist.id+"'));");*/
			pref.preferences.appendChild(newpref);
			//if (newpref.value==null) break; /*newpref=document.getElementById(entryid);*/
		  }
		  else {
		    if (!document.getElementById(entryid)) break;
			appendPrefEntry(folderlist,entryid,emptytext);
			if (i==1) folderlist.selectedIndex=0;
			if (!document.getElementById(entryid).value) break;
		  }
		}
	}
}

function removeEntry(button, folderlist) {
	//aedump("*");
	var resetpref=document.getElementById(button.getAttribute('_preference'));
	/*for (f in resetpref) aedump(f+":"+resetpref[f]+"\n") */
	if (!resetpref.value) return;
	else resetpref.reset();
	var prefid=folderlist.getAttribute("preference");
	var pref=document.getElementById(prefid);
	if (!pref) return;
	for (var i=1;i<100;i++) {
		var cpref=document.getElementById(prefid+"_"+i);
		var npref=document.getElementById(prefid+"_"+(i+1));
		if (!cpref||!npref) break;
		//aedump(i+") cval: "+(cpref.value?cpref.value.leafName:cpref.value)+"; nval: "+(npref.value?npref.value.leafName:npref.value)+"\n");
		if (!cpref.value && npref.value) {
			cpref.value=npref.value;
			npref.reset();
			//continue;
		}
	}
	folderlist.removeItemAt(folderlist.childNodes.length-1);
}
 
function addEntry(button,folderlist) {
	var prefid=button.getAttribute('_preference');
	browseForFolder(prefid);
	var addpref=document.getElementById(prefid);
	//aedump(prefid+"="+addpref.value+"\n");
	if (!addpref.value) return;
	//aedump('*');
	if (folderlist.getItemAtIndex(folderlist.childNodes.length-1).getAttribute('preference')==prefid) {
		var clearpref=folderlist.getAttribute("preference")+"_"+(folderlist.childNodes.length+1);
		appendPrefEntry(folderlist,clearpref,document.getElementById("aestrbundle").getString("EmptyLineText"));
		document.getElementById(clearpref).updateElements();
	}
}

function updateEditBox(ele) {
	var pref=ele.selectedItem.getAttribute("preference");
	//aedump(pref+";\n");
	document.getElementById("parent1").setAttribute("preference",pref);
	document.getElementById(pref).updateElements();
	document.getElementById("parentbutton").setAttribute("_preference",pref);
	document.getElementById("parentbutton").removeAttribute("disabled");
	document.getElementById("parentresetbutton").setAttribute("_preference",pref);
	document.getElementById("parentresetbutton").removeAttribute("disabled");
}

try {
var filemaker= new AttachmentFileMaker(null,null,null);
var exampleDate=new Date();
}catch (e) {}

function check_filenamepattern(element,countpattern) {
	if ((!countpattern&&filemaker.isValidFilenamePattern(element.value))||(filemaker.isValidCountPattern(element.value))) return;
	var Cc=Components.classes;
	var Ci=Components.interfaces;
	var prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
		
	/*if (prompts.confirm(window,
						bundle.getString("FileNamePatternFixTitle") ,
						bundle.getString("FileNamePatternFixMessage").replace("%1$s",filemaker.fixFilenamePattern(element.value))
						) {*/
	var bundle=	document.getElementById("aestrbundle");	
	var fixed= (!countpattern)?filemaker.fixFilenamePattern(element.value):filemaker.fixCountPattern(element.value);
	if (prompts.confirmEx(window,
    				  bundle.getString("FileNamePatternFixTitle"),
					  bundle.getString("FileNamePatternFixMessage").replace("%1$s",fixed),
                   	  prompts.STD_YES_NO_BUTTONS,
                      "",
                      "",
                      "",
                      null,
                      {})==0) {
			element.value=fixed;
	}
}

function updateexamplefilename(fnpbox) {
	var pattern=fnpbox.value;
	var countpattern=document.getElementById('filenamepatterncount').value;
	var datepattern=document.getElementById('pref_datepattern').value;
	var docleansubject=document.getElementById('filenamepatterncleansubject').checked;
	var exname=document.getElementById('filenamepattern_examplename').value;
	var cleansubjectstrings=document.getElementById('pref_cleansubjectstrings').value.toLowerCase().split(',');
	
	var excache=new AttachmentFileMaker.AttachmentFileMakerCache();
	excache.subject=document.getElementById('filenamepattern_examplesubject').value.replace(filemaker.tokenregexs.subject, "_");
	excache.author=document.getElementById('filenamepattern_exampleauthor').value.replace(filemaker.tokenregexs.author, "");
	excache.authoremail=document.getElementById('filenamepattern_exampleauthor').value.replace(filemaker.tokenregexs.authoremail, "");
	excache.datetime=filemaker.formatdatestring(datepattern,exampleDate);
	excache.mailfolder=document.getElementById('filenamepattern_examplefolder').value.replace(filemaker.tokenregexs.folder, "");
	
	var cleansubject=filemaker.cleanSubjectLine(excache.subject,cleansubjectstrings);
	if (docleansubject) excache.subject=cleansubject;
		
	var st=filemaker.generate(pattern.replace(/#count#/g,""),null,exname,1,excache);
	var st2=filemaker.generate(pattern.replace(/#count#/g,countpattern),null,exname,1,excache);
	
	document.getElementById('filenamepattern_examplecleansubject').value=cleansubject;
	document.getElementById('filenamepattern_exampledategenerated').value=excache.datetime;
	document.getElementById('filenamepattern_examplegenerated').value=st;
	document.getElementById('filenamepattern_examplegenerated2').value=st2;
}

function add_to_pattern(button,fnpbox) {
	var postindex=fnpbox.selectionStart+button.label.length;
	fnpbox.value=fnpbox.value.substring(0,fnpbox.selectionStart)+button.label+fnpbox.value.substring(fnpbox.selectionEnd);
	fnpbox.setSelectionRange(postindex,postindex);
}

function showAutoDetachWarning(checkbox) {
	if (!checkbox.checked) return;
	var amessage=document.getElementById("aestrbundle").getString("ConfirmAutoDetachSettingDialogMessage");
	alert(amessage);
}

function filltaglist() {
	var taglist=document.getElementById('autotriggertag');
	if (taglist.selectedItem!=null) return;  //sometimes triggers twice. don't know why but stop it anyway.
	var tagService = Components.classes["@mozilla.org/messenger/tagservice;1"].getService(Components.interfaces.nsIMsgTagService);
    var tagArray = tagService.getAllTags({});
	if (tagArray) {
		for (var tagInfo of tagArray) {
			if (tagInfo.tag) taglist.appendItem(tagInfo.tag,tagInfo.key);
		}
	}
	return;
}

function fillcountlist() {
	var countlist=document.getElementById('savepathmrucount');
	if (countlist.selectedItem!=null) return;  //sometimes triggers twice. don't know why but stop it anyway.
	for (var i=1;i<=attachmentextractor.MRUMAXCOUNT;i++) {
		countlist.appendItem(i+"",i);
	}
	return;
}