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
 
// rememeber that prefs that start with numbers won't show up in debug log //

pref("extensions.attachmentextractor_cont.extract.mode",0);
pref("extensions.attachmentextractor_cont.extract.minimumsize",0);

pref("extensions.attachmentextractor_cont.overwritepolicy",0);
pref("extensions.attachmentextractor_cont.extractinlinetoo",false);
pref("extensions.attachmentextractor_cont.actionafterextract.markread",false);
pref("extensions.attachmentextractor_cont.actionafterextract.savemessage",false);
pref("extensions.attachmentextractor_cont.actionafterextract.launch",false);
pref("extensions.attachmentextractor_cont.actionafterextract.endlaunch",false);
pref("extensions.attachmentextractor_cont.actionafterextract.endlaunch.application","");
pref("extensions.attachmentextractor_cont.actionafterextract.delete",false);
pref("extensions.attachmentextractor_cont.actionafterextract.detach",false);
pref("extensions.attachmentextractor_cont.actionafterextract.detach.mode",0);
pref("extensions.attachmentextractor_cont.actionafterextract.detach.confirm",true);
pref("extensions.attachmentextractor_cont.includeenabled",0);
pref("extensions.attachmentextractor_cont.includepatterns4","*.jpeg;*.jpg");
pref("extensions.attachmentextractor_cont.excludepatterns4","*.bat;*.exe;*.eml");
pref("extensions.attachmentextractor_cont.returnreceipts",false);
pref("extensions.attachmentextractor_cont.returnreceipts.override",false);
pref("extensions.attachmentextractor_cont.dontloadimages",true);

pref("extensions.attachmentextractor_cont.filenamepattern","#namepart##count##extpart#");
pref("extensions.attachmentextractor_cont.filenamepattern.countpattern","-%");
pref("extensions.attachmentextractor_cont.filenamepattern.datepattern","D M d Y");
pref("extensions.attachmentextractor_cont.filenamepattern.cleansubject",false);
pref("extensions.attachmentextractor_cont.filenamepattern.cleansubject.strings","re: ,fw: ,fwd: ");
pref("extensions.attachmentextractor_cont.filenamepattern.savemessage","#subject##count#.html");
pref("extensions.attachmentextractor_cont.filenamepattern.savemessage.countpattern","-%");

pref("extensions.attachmentextractor_cont.debug",false);
pref("extensions.attachmentextractor_cont.debugonstart",false);
pref("extensions.attachmentextractor_cont.notifywhendone",true);
pref("extensions.attachmentextractor_cont.nextattachmentdelay",5);
pref("extensions.attachmentextractor_cont.nextmessagedelay",50);
pref("extensions.attachmentextractor_cont.defaultsavepath","");
pref("extensions.attachmentextractor_cont.defaultsavepath.relative","");
pref("extensions.attachmentextractor_cont.defaultsavepath.relative.key","");
pref("extensions.attachmentextractor_cont.savepathmru",true);
pref("extensions.attachmentextractor_cont.savepathmru.count",5);
pref("extensions.attachmentextractor_cont.setdatetoemail",false);
pref("extensions.attachmentextractor_cont.queuerequests",true);

pref("extensions.attachmentextractor_cont@thunderbird-mail.de.description","chrome://attachmentextractor_cont/locale/attachmentextractor.properties");

pref("extensions.attachmentextractor_cont.skipidentical",false);
pref("extensions.attachmentextractor_cont.suggestfolder",false);
pref("extensions.attachmentextractor_cont.suggestfolder.parent",true);
pref("extensions.attachmentextractor_cont.suggestfolder.excludekeywords",""); 
pref("extensions.attachmentextractor_cont.suggestfolder.disregardduplicates",true);
pref("extensions.attachmentextractor_cont.suggestfolder.maxmatches",10);

pref("extensions.attachmentextractor_cont.fixdetachedimages",false);

pref("extensions.attachmentextractor_cont.autoextract",false);
pref("extensions.attachmentextractor_cont.autoextract.savepath","");
pref("extensions.attachmentextractor_cont.autoextract.savepath.relative","");
pref("extensions.attachmentextractor_cont.autoextract.savepath.relative.key","");
pref("extensions.attachmentextractor_cont.autoextract.ontriggeronly",true);
pref("extensions.attachmentextractor_cont.autoextract.triggertag","ae_autoextract");
pref("extensions.attachmentextractor_cont.autoextract.cleartag",false);
pref("extensions.attachmentextractor_cont.autoextract.waitforall",false);
pref("extensions.attachmentextractor_cont.autoextract.markread",false);
pref("extensions.attachmentextractor_cont.autoextract.savemessage",false);
pref("extensions.attachmentextractor_cont.autoextract.launch",false);
pref("extensions.attachmentextractor_cont.autoextract.endlaunch",false);
pref("extensions.attachmentextractor_cont.autoextract.endlaunch.application","");
pref("extensions.attachmentextractor_cont.autoextract.delete",false);
pref("extensions.attachmentextractor_cont.autoextract.detach",false);
pref("extensions.attachmentextractor_cont.autoextract.detach.mode",1);
pref("extensions.attachmentextractor_cont.autoextract.overwritepolicy",2);
pref("extensions.attachmentextractor_cont.autoextract.onattachmentsonly",true);
pref("extensions.attachmentextractor_cont.autoextract.filenamepattern","");

pref("extensions.attachmentextractor_cont.reportgen",false);
pref("extensions.attachmentextractor_cont.reportgen.cssfile", "");
pref("extensions.attachmentextractor_cont.reportgen.embedcss", false);
pref("extensions.attachmentextractor_cont.reportgen.thumbnail", true);
pref("extensions.attachmentextractor_cont.reportgen.reportname", "aec_report.html");
pref("extensions.attachmentextractor_cont.reportgen.append", true);

pref("extensions.attachmentextractor_cont.progressdialog.showtext",true);