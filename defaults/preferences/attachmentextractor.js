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
 * Portions created by the Initial Developer are Copyright (C) 2005-2009
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
 
// rememeber that prefs that start with numbers won't show up in debug log //

pref("attachmentextractor.extract.mode",1);
pref("attachmentextractor.extract.minimumsize",0);

pref("attachmentextractor.overwritepolicy",0);
pref("attachmentextractor.extractinlinetoo",false);
pref("attachmentextractor.actionafterextract.markread",false);
pref("attachmentextractor.actionafterextract.savemessage",false);
pref("attachmentextractor.actionafterextract.launch",false);
pref("attachmentextractor.actionafterextract.endlaunch",false);
pref("attachmentextractor.actionafterextract.endlaunch.application","");
pref("attachmentextractor.actionafterextract.delete",false);
pref("attachmentextractor.actionafterextract.detach",false);
pref("attachmentextractor.actionafterextract.detach.mode",0);
pref("attachmentextractor.actionafterextract.detach.confirm",true);
pref("attachmentextractor.includeenabled",0);
pref("attachmentextractor.includepatterns4","*.jpeg;*.jpg");
pref("attachmentextractor.excludepatterns4","*.bat;*.exe;*.eml");
pref("attachmentextractor.returnreceipts",false);
pref("attachmentextractor.returnreceipts.override",false);
pref("attachmentextractor.dontloadimages",true);

pref("attachmentextractor.filenamepattern","#namepart##count##extpart#");
pref("attachmentextractor.filenamepattern.countpattern","-%");
pref("attachmentextractor.filenamepattern.datepattern","D M d Y");
pref("attachmentextractor.filenamepattern.cleansubject",false);
pref("attachmentextractor.filenamepattern.cleansubject.strings","re: ,fw: ,fwd: ");
pref("attachmentextractor.filenamepattern.savemessage","#subject##count#.html");
pref("attachmentextractor.filenamepattern.savemessage.countpattern","-%");

pref("attachmentextractor.debug",false);
pref("attachmentextractor.debugonstart",false);
pref("attachmentextractor.notifywhendone",true);
pref("attachmentextractor.nextattachmentdelay",5);
pref("attachmentextractor.nextmessagedelay",50);
pref("attachmentextractor.defaultsavepath","");
pref("attachmentextractor.defaultsavepath.relative","");
pref("attachmentextractor.defaultsavepath.relative.key","");
pref("attachmentextractor.savepathmru",true);
pref("attachmentextractor.savepathmru.count",5);
pref("attachmentextractor.setdatetoemail",false);
pref("attachmentextractor.queuerequests",true);

pref("attachmentextractor.firstuse","");
pref("attachmentextractor.firstuse.toolbarbutton",false);
pref("extensions.{35834d20-efdb-4f78-ab77-9635fb4e56c4}.description","chrome://attachmentextractor/locale/attachmentextractor.properties");

pref("attachmentextractor.skipidentical",false);
pref("attachmentextractor.suggestfolder",false);
pref("attachmentextractor.suggestfolder.parent",true);
pref("attachmentextractor.suggestfolder.excludekeywords",""); 
pref("attachmentextractor.suggestfolder.disregardduplicates",true);
pref("attachmentextractor.suggestfolder.maxmatches",10);

pref("attachmentextractor.fixdetachedimages",false);

pref("attachmentextractor.autoextract",false);
pref("attachmentextractor.autoextract.savepath","");
pref("attachmentextractor.autoextract.savepath.relative","");
pref("attachmentextractor.autoextract.savepath.relative.key","");
pref("attachmentextractor.autoextract.ontriggeronly",true);
pref("attachmentextractor.autoextract.triggertag","ae_autoextract");
pref("attachmentextractor.autoextract.cleartag",false);
pref("attachmentextractor.autoextract.waitforall",false);
pref("attachmentextractor.autoextract.markread",false);
pref("attachmentextractor.autoextract.savemessage",false);
pref("attachmentextractor.autoextract.launch",false);
pref("attachmentextractor.autoextract.endlaunch",false);
pref("attachmentextractor.autoextract.endlaunch.application","");
pref("attachmentextractor.autoextract.delete",false);
pref("attachmentextractor.autoextract.detach",false);
pref("attachmentextractor.autoextract.detach.mode",1);
pref("attachmentextractor.autoextract.overwritepolicy",2);
pref("attachmentextractor.autoextract.onattachmentsonly",true);
pref("attachmentextractor.autoextract.filenamepattern","");

pref("attachmentextractor.reportgen",false);
pref("attachmentextractor.reportgen.cssfile", "");
pref("attachmentextractor.reportgen.embedcss", false);
pref("attachmentextractor.reportgen.thumbnail", true);
pref("attachmentextractor.reportgen.reportname", "aereport.html");
pref("attachmentextractor.reportgen.append", true);

pref("attachmentextractor.progressdialog.showtext",true);