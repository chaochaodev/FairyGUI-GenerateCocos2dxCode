"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genCode = void 0;
const CodeWriter_1 = require("./CodeWriter");
function genCode(handler) {
    let settings = handler.project.GetSettings("Publish").codeGeneration;
    let codePkgName = handler.ToFilename(handler.pkg.name); //convert chinese to pinyin, remove special chars etc.
    let exportCodePath = handler.exportCodePath + '/' + codePkgName;
    let namespaceName = codePkgName;
    let binderName = codePkgName + 'Binder';
    if (settings.packageName)
        namespaceName = settings.packageName + '_' + namespaceName;
    //CollectClasses(stripeMemeber, stripeClass, fguiNamespace)
    let classes = handler.CollectClasses(settings.ignoreNoname, settings.ignoreNoname, null);
    handler.SetupCodeFolder(exportCodePath, "cpp,h"); //check if target folder exists, and delete old files
    let getMemberByName = settings.getMemberByName;
    let classCnt = classes.Count;
    let writer = new CodeWriter_1.default();
    for (let i = 0; i < classCnt; i++) {
        let classInfo = classes.get_Item(i);
        let members = classInfo.members;
        let references = classInfo.references;
        writer.reset();
        writer.writeln('#ifndef __%s_%s_H__', codePkgName, classInfo.className);
        writer.writeln('#define __%s_%s_H__', codePkgName, classInfo.className);
        writer.writeln();
        writer.writeln('#include "FairyGUI.h"');
        writer.writeln();
        writer.writeln('namespace %s', namespaceName);
        writer.writeln('{'); writer.incIndent();
        let refCount = references.Count;
        if (refCount > 0) {
            for (let j = 0; j < refCount; j++) {
                let ref = references.get_Item(j);
                writer.writeln('class %s;', ref);
            }
        }
        if (classInfo.superClassName.indexOf("G") == 0) {
            classInfo.superClassName = 'fairygui::' + classInfo.superClassName;
        }
        writer.writeln('class %s : public %s', classInfo.className, classInfo.superClassName);
        writer.writeln('{'); writer.incIndent();
        writer.writeln('public:');
        writer.incIndent();
        writer.writeln('static const std::string URL;');
        writer.writeln('static %s* create();', classInfo.className);
        writer.writeln();
        let memberCnt = members.Count;
        for (let j = 0; j < memberCnt; j++) {
            let memberInfo = members.get_Item(j);
            if (memberInfo.type == 'Controller') {
                memberInfo.type = 'GController';
            }
            var fullMemberInfoType;
            if (memberInfo.type.indexOf("UI_") == 0) {
                fullMemberInfoType = memberInfo.type;
            } else {
                fullMemberInfoType = 'fairygui::' + memberInfo.type;
            }
            writer.writeln('%s* %s = nullptr;', fullMemberInfoType, memberInfo.varName);
        }
        writer.decIndent();
        writer.writeln();
        writer.writeln('protected:');
        writer.incIndent();
        writer.writeln('virtual void onConstruct() override;');
        writer.decIndent();
        writer.writeln();
        writer.writeln('private:');
        writer.incIndent();
        writer.writeln('static %s* createByBinder();', classInfo.className);
        writer.writeln('friend class %s;', binderName);
        writer.decIndent();
        writer.decIndent(); writer.writeln('};');
        writer.decIndent(); writer.writeln('}');
        writer.writeln();
        writer.writeln('#endif');
        writer.save(exportCodePath + '/' + classInfo.className + '.h');
        //----------------
        writer.reset();
        writer.writeln('#include "%s.h"', binderName);
        writer.writeln();
        writer.writeln('namespace %s', namespaceName);
        writer.writeln('{'); writer.incIndent();
        writer.writeln('USING_NS_FGUI;');
        writer.writeln();
        writer.writeln('const std::string %s::URL = "ui://%s%s";', classInfo.className, handler.pkg.id, classInfo.resId);
        writer.writeln();
        writer.writeln('%s* %s::create()', classInfo.className, classInfo.className);
        writer.writeln('{'); writer.incIndent();
        writer.writeln('return dynamic_cast<%s*>(UIPackage::createObject("%s", "%s"));', classInfo.className, handler.pkg.name, classInfo.resName);
        writer.decIndent(); writer.writeln('}');
        writer.writeln();
        writer.writeln('%s* %s::createByBinder()', classInfo.className, classInfo.className);
        writer.writeln('{'); writer.incIndent();
        writer.writeln('%s *pRet = new(std::nothrow) %s();', classInfo.className, classInfo.className);
        writer.writeln('if (pRet && pRet->init())');
        writer.writeln('{'); writer.incIndent();
        writer.writeln('pRet->autorelease();');
        writer.writeln('return pRet;');
        writer.decIndent(); writer.writeln('}');
        writer.writeln('else');
        writer.writeln('{'); writer.incIndent();
        writer.writeln('delete pRet;');
        writer.writeln('pRet = nullptr;');
        writer.writeln('return nullptr;');
        writer.decIndent(); writer.writeln('}');
        writer.decIndent(); writer.writeln('}');
        writer.writeln();
        writer.writeln('void %s::onConstruct()', classInfo.className);
        writer.writeln('{'); writer.incIndent();
        for (let j = 0; j < memberCnt; j++) {
            let memberInfo = members.get_Item(j);
            if (memberInfo.group == 0) {
                if (getMemberByName)
                    writer.writeln('%s = dynamic_cast<%s*>(getChild("%s"));', memberInfo.varName, memberInfo.type, memberInfo.name);
                else
                    writer.writeln('%s = dynamic_cast<%s*>(getChildAt(%s));', memberInfo.varName, memberInfo.type, memberInfo.index);
            }
            else if (memberInfo.group == 1) {
                if (getMemberByName)
                    writer.writeln('%s = getController("%s");', memberInfo.varName, memberInfo.name);
                else
                    writer.writeln('%s = getControllerAt(%s);', memberInfo.varName, memberInfo.index);
            }
            else {
                if (getMemberByName)
                    writer.writeln('%s = getTransition("%s");', memberInfo.varName, memberInfo.name);
                else
                    writer.writeln('%s = getTransitionAt(%s);', memberInfo.varName, memberInfo.index);
            }
        }
        writer.decIndent(); writer.writeln('}');
        writer.decIndent(); writer.writeln('}');
        writer.save(exportCodePath + '/' + classInfo.className + '.cpp');
    }
    writer.reset();
    writer.writeln('#ifndef __%s_%s_H__', codePkgName, binderName);
    writer.writeln('#define __%s_%s_H__', codePkgName, binderName);
    writer.writeln();
    writer.writeln('#include "FairyGUI.h"');
    for (let i = 0; i < classCnt; i++) {
        let classInfo = classes.get_Item(i);
        writer.writeln('#include "%s.h"', classInfo.className);
    }
    writer.writeln();
    writer.writeln('namespace %s', namespaceName);
    writer.writeln('{'); writer.incIndent();
    writer.writeln('class %s', binderName);
    writer.writeln('{'); writer.incIndent();
    writer.writeln('public:');
    writer.incIndent();
    writer.writeln('static void bindAll();');
    writer.decIndent();
    writer.decIndent(); writer.writeln('};');
    writer.decIndent(); writer.writeln('}');
    writer.writeln();
    writer.writeln('#endif');
    writer.save(exportCodePath + '/' + binderName + '.h');
    //-----------------------------------
    writer.reset();
    writer.writeln('#include "%s.h"', binderName);
    writer.writeln();
    writer.writeln('namespace %s', namespaceName);
    writer.writeln('{'); writer.incIndent();
    writer.writeln('USING_NS_FGUI;');
    writer.writeln();
    writer.writeln('void %s::bindAll()', binderName);
    writer.writeln('{'); writer.incIndent();
    for (let i = 0; i < classCnt; i++) {
        let classInfo = classes.get_Item(i);
        writer.writeln('UIObjectFactory::setPackageItemExtension(%s::URL, std::bind(&%s::createByBinder));', classInfo.className, classInfo.className);
    }
    writer.decIndent(); writer.writeln('}');
    writer.decIndent(); writer.writeln('}');
    writer.save(exportCodePath + '/' + binderName + '.cpp');
}
exports.genCode = genCode;
