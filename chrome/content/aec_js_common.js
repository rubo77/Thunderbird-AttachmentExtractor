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
 * Portions created by the Initial Developer are Copyright (C) 2009
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

var aedebug=false;
var aedebugFile=null;
try{
	aedebug=Components.classes["@mozilla.org/preferences-service;1"].
		getService(Components.interfaces.nsIPrefBranch).getBoolPref("extensions.attachmentextractor_cont.debug");
	if (aedebug) {
		aedebug= Components.classes['@mozilla.org/network/file-output-stream;1'].
						createInstance(Components.interfaces.nsIFileOutputStream);
		aedebugFile=Components.classes["@mozilla.org/file/directory_service;1"].
						getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
		aedebugFile.append('aec_debug.txt');
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
		} catch (e) {dump("!NOT LOGGED: ");}
		dump(arguments[0]);
	}
} : function () {};

/* shortcut object to get & set ae's preferences.*/
function AEPrefs() {
	this.aeBranch = Components.classes["@mozilla.org/preferences-service;1"].
					getService(Components.interfaces.nsIPrefService).getBranch("extensions.attachmentextractor_cont.");
	this. prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
	this.get = function get(pref,branch) {
		var ps=(typeof branch == "undefined")?this.aeBranch:this.prefService.getBranch(branch);
		var type= ps.getPrefType(pref);
		if (type==ps.PREF_BOOL) return ps.getBoolPref(pref);
		if (type==ps.PREF_INT) return ps.getIntPref(pref);
		if (type==ps.PREF_STRING) return ps.getCharPref(pref);
		return null;
	};
	this.getComplex = function getComplex(pref,branch) {
		return ((typeof branch == "undefined")?this.aeBranch:this.prefService.getBranch(branch)).getStringPref(pref);
	};			
	this.getFile = function getFile(pref,branch) {
		return this.getComplex(pref,branch);
	};
	this.getRelFile = function getRelFile(pref,branch) {
		return this.getComplex(pref,branch).file;
	};	
	this.getRelFileKey = function getRelFile(pref,branch) {
		return this.getComplex(pref,branch).relativeToKey;
	};	
	this.set = function set(pref,value,branch) {
		var ps=(typeof branch == "undefined")?this.aeBranch:this.prefService.getBranch(branch);
		var type= ps.getPrefType(pref);
		if (type==ps.PREF_BOOL) return ps.setBoolPref(pref,value);
		if (type==ps.PREF_INT) return ps.setIntPref(pref,value);
		if (type==ps.PREF_STRING) return ps.setCharPref(pref,value);
		return null;
	};
	this.setComplex = function setComplex(pref,value,branch) {
		return ((typeof branch == "undefined")?this.aeBranch:this.prefService.getBranch(branch)).setStringPref(pref,value);
	};			
	this.setFile = function getFile(pref,value,branch) {
		return this.setComplex(pref,value,branch);
	}
	this.setRelFile = function setRelFile(pref,value,key,branch) {
		var relFile = Components.classes["@mozilla.org/pref-relativefile;1"].createInstance(Components.interfaces.nsIRelativeFilePref);
		var oldValue = (this.hasUserValue(pref,branch))?this.getComplex(pref,branch):null;
		relFile.relativeToKey = key ? key : oldValue.relativeToKey; 
		relFile.file = value ? value : oldValue.file;          
		return this.setComplex(pref,relFile,branch);
	};	
	this.hasUserValue = function hasUserValue(pref,branch) {
		return ((typeof branch == "undefined")?this.aeBranch:this.prefService.getBranch(branch)).prefHasUserValue(pref);
	};		
};