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
 * Portions created by the Initial Developer are Copyright (C) 2006
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

function onGeneralPaneLoad(event)
{
	document.getElementById('savefolder').value=syncFromFilePref('pref_savefolder');
	document.getElementById('afterextractendlaunchapplication').value=syncFromFilePref('pref_afterextractendlaunchapplication');
	enableField(document.getElementById('afterextractpolicydetach'),'afterextractpolicydetachmode');
	enableField(document.getElementById('afterextractsavemessage'),['fnpsavemessage','fnpsavemessagecountpattern']);
	//flex();
}

function syncFromFilePref(pref) {
	var prefval=document.getElementById(pref);
	if (prefval && prefval.value && prefval.value.path) return prefval.value.path;
	return "";
}

/*function syncFromFilePref(this) {
	var pref=document.getElementById(this.getAttribute("preference"));
	var prefval=document.getElementById(pref);
	if (prefval && prefval.value && prefval.value.path) return prefval.value.path;
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
	
function browseFolder(pref_el_id,text_el_id) { 
	var prefn=document.getElementById(pref_el_id);
	var newv=attachmentextractor.getSaveFolder(prefn.getAttribute("name"),false);
	if (!newv) return;
  	prefn.value=newv;
	document.getElementById(text_el_id).value=newv.path;
}

function browseForExecutable(pref_el_id,text_el_id) {
	var Cc=Components.classes;
	var Ci=Components.interfaces;
	var pref=document.getElementById(pref_el_id);
	var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
	var windowTitle = document.getElementById("aestrbundle").getString("ExecutableFilePickerDialogTitle");
    try {
         fp.init(window, windowTitle, Ci.nsIFilePicker.modeOpen);
		 fp.appendFilters(Ci.nsIFilePicker.filterApps || Ci.nsIFilePicker.filterAll )
         try {
         	var initial = pref.value;
            if (initial) fp.displayDirectory = initial.parent;
         } catch (e) {aedump(e,1);}
         var r = fp.show();
         if (r == Ci.nsIFilePicker.returnCancel) return;
    } catch(e) {aedump(e,0);}
	pref.value=fp.file ;
	document.getElementById(text_el_id).value=fp.file.path;
}

function showDetachWarning(radiobox) {
	if (!radiobox.selected) return;
	var amessage=document.getElementById("aestrbundle").getString("ConfirmDetachSettingDialogMessage");
	alert(amessage);
}

function showReturnReceiptSettings() {
	document.documentElement.openSubDialog("chrome://attachmentextractor/content/settings/general_receipt.xul","", null);
}

function onAdvancedPaneLoad(event) {
	enableField(document.getElementById('extractmode1'),new Array('setdatetoemail','minimumsize'));
	//flex();
}

function onReportPaneLoad(event) {
	document.getElementById('reportgencssfile').value=syncFromFilePref('pref_reportgencssfile');
	//flex();
}


function browseForCss(pref_el_id,text_el_id) {
	var Cc=Components.classes;
	var Ci=Components.interfaces;
	var pref=document.getElementById(pref_el_id);
	var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
	try {
         fp.init(window, document.getElementById("aestrbundle").getString("CSSFilePickerDialogTitle"), Ci.nsIFilePicker.modeOpen);
         fp.appendFilter(document.getElementById("aestrbundle").getString("CSSFileFilterDescription"),"*.css"); 
		 try {
         	var initial = pref.value;
            if (initial) fp.displayDirectory = initial.parent;
         } catch (e) {dump(e);}
         var r = fp.show();
         if (r == Ci.nsIFilePicker.returnCancel) return;
    } catch(e) {dump(e);}
	pref.value=fp.file;
	document.getElementById(text_el_id).value=fp.file.path;
}

try {
var filemaker= new AttachmentFileMaker(null,null,null);
var exampleDate=new Date();
}catch (e) {}

function onFilenamePaneLoad(event) {
	enableField(document.getElementById('iep0false'),'excludepatterns');
	enableField(document.getElementById('iep1true'),'includepatterns');
	document.getElementById('filenamepattern_exampledate').value=exampleDate.toLocaleString();
	updateexamplefilename();
	//flex();
}

function check_filenamepattern(element) {
	if (filemaker.isValidFilenamePattern(element.value)) return;
	element.value=filemaker.fixFilenamePattern(element.value);
}

function updateexamplefilename() {
	var pattern=document.getElementById('filenamepattern').value;
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

function add_to_pattern(button) {
	var fnpbox=document.getElementById('filenamepattern');
	var postindex=fnpbox.selectionStart+button.label.length;
	fnpbox.value=fnpbox.value.substring(0,fnpbox.selectionStart)+button.label+fnpbox.value.substring(fnpbox.selectionEnd);
	fnpbox.setSelectionRange(postindex,postindex);
}

function showDateSettings() {
	var param={p1:document.getElementById('pref_datepattern').value,out:null};
	window.openDialog("chrome://attachmentextractor/content/settings/filename_date.xul", "",
    				  "chrome, dialog, modal, resizable=yes", param).focus();
	if (param.out) {
    	document.getElementById('pref_datepattern').value=param.out;
		updateexamplefilename();
  	}
}

function onAutoPaneLoad(event) {
	enableField(document.getElementById('autotriggeronly'),'autotriggertag');
	enableField(document.getElementById('autodetach'),'autodetachmode');
	enableField(document.getElementById('autosavemessage'),['autofnpsavemessage','autofnpsavemessagecountpattern']);
	document.getElementById('autosavefolder').value=syncFromFilePref('pref_autosavefolder');
	//flex();
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
	for each (var tagInfo in tagArray) {
		if (tagInfo.tag) taglist.appendItem(tagInfo.tag,tagInfo.key);
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