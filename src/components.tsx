/*
 * @author: tisfeng
 * @createTime: 2022-06-26 11:13
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-07-31 12:41
 * @fileName: components.tsx
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { Action, ActionPanel, Color, Icon, Image, List, openCommandPreferences } from "@raycast/api";
import { useState } from "react";
import { sayTruncateCommand } from "./audio";
import { languageItemList } from "./consts";
import { LingueeDisplayType } from "./dict/linguee/types";
import { playYoudaoWordAudioAfterDownloading } from "./dict/youdao/request";
import ReleaseLogDetail from "./releaseVersion/releaseLog";
import { Easydict } from "./releaseVersion/versionInfo";
import { openInEudic } from "./scripts";
import {
  ActionListPanelProps,
  DicionaryType,
  ListDisplayType,
  QueryType,
  QueryWordInfo,
  SectionType,
  TranslationType,
  WebTranslationItem,
  YoudaoTranslateReformatResultItem,
} from "./types";
import {
  checkIfNeedShowReleasePrompt,
  getDeepLWebTranslateURL,
  getEudicWebTranslateURL,
  getGoogleWebTranslateURL,
  getYoudaoWebTranslateURL,
  myPreferences,
} from "./utils";

export const eudicBundleId = "com.eusoft.freeeudic";

/**
 * Get the list action panel item with ListItemActionPanelItem
 */
export function ListActionPanel(props: ActionListPanelProps) {
  const [isShowingReleasePrompt, setIsShowingReleasePrompt] = useState<boolean>(false);

  const queryWordInfo = props.displayItem.queryWordInfo;
  const googleWebItem = getWebTranslationItem(TranslationType.Google, queryWordInfo);
  const deepLWebItem = getWebTranslationItem(TranslationType.DeepL, queryWordInfo);
  const youdaoWebItem = getWebTranslationItem(DicionaryType.Youdao, queryWordInfo);
  const eudicWebItem = getWebTranslationItem(DicionaryType.Eudic, queryWordInfo);

  checkIfNeedShowReleasePrompt((isShowing) => {
    setIsShowingReleasePrompt(isShowing);
  });

  function onNewReleasePromptClick() {
    const easydict = new Easydict();
    easydict.hideReleasePrompt().then(() => {
      setIsShowingReleasePrompt(false);
    });
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {isShowingReleasePrompt && (
          <ActionRecentUpdate title="✨ New Version Released" onPush={onNewReleasePromptClick} />
        )}
        {props.isInstalledEudic && (
          <Action icon={Icon.MagnifyingGlass} title="Open In Eudic" onAction={() => openInEudic(queryWordInfo.word)} />
        )}
        <Action.CopyToClipboard
          onCopy={() => {
            console.log("copy: ", props.displayItem.copyText);
          }}
          title={`Copy Text`}
          content={props.displayItem.copyText || ""}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Search Query Text Online">
        <WebTranslationAction webTranslationItem={deepLWebItem} />
        <WebTranslationAction webTranslationItem={googleWebItem} />
        {queryWordInfo.isWord && <WebTranslationAction webTranslationItem={youdaoWebItem} />}
        {queryWordInfo.isWord && <WebTranslationAction webTranslationItem={eudicWebItem} />}
      </ActionPanel.Section>

      <ActionPanel.Section title="Play Text Audio">
        <Action
          title="Play Query Text"
          icon={playSoundIcon("black")}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={() => {
            console.log(`start play sound: ${queryWordInfo.word}`);
            playYoudaoWordAudioAfterDownloading(queryWordInfo);
          }}
        />
        <Action
          title="Play Result Text"
          icon={playSoundIcon("black")}
          onAction={() => {
            /**
             *  directly use say command to play the result text.
             *  because it is difficult to determine whether the result is a word, impossible to use Youdao web audio directly.
             *  in addition, TTS needs to send additional youdao query requests.
             *
             *  Todo: add a shortcut to stop playing audio.
             */
            sayTruncateCommand(props.displayItem.copyText, queryWordInfo.toLanguage);
          }}
        />
      </ActionPanel.Section>

      {myPreferences.isDisplayTargetTranslationLanguage && (
        <ActionPanel.Section title="Target Language">
          {languageItemList.map((selectedLanguageItem) => {
            // hide auto language
            const isAutoLanguage = selectedLanguageItem.youdaoLanguageId === "auto";
            // hide current detected language
            const isSameWithDetectedLanguage = selectedLanguageItem.youdaoLanguageId === queryWordInfo.fromLanguage;
            const isSameWithTargetLanguage = selectedLanguageItem.youdaoLanguageId === queryWordInfo.toLanguage;
            if (isAutoLanguage || isSameWithDetectedLanguage) {
              return null;
            }

            return (
              <Action
                key={selectedLanguageItem.youdaoLanguageId}
                title={selectedLanguageItem.languageTitle}
                onAction={() => props.onLanguageUpdate(selectedLanguageItem)}
                icon={isSameWithTargetLanguage ? Icon.ArrowRight : Icon.Globe}
              />
            );
          })}
        </ActionPanel.Section>
      )}

      <ActionPanel.Section>
        {!isShowingReleasePrompt && <ActionRecentUpdate />}
        <ActionCurrentVersion />
        <ActionOpenCommandPreferences />
        <ActionFeedback />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function ActionFeedback() {
  const easydict = new Easydict();
  return <Action.OpenInBrowser icon={Icon.QuestionMark} title="Feedback" url={easydict.getIssueUrl()} />;
}

function ActionOpenCommandPreferences() {
  return <Action icon={Icon.Gear} title="Preferences" onAction={openCommandPreferences} />;
}

function ActionRecentUpdate(props: { title?: string; onPush?: () => void }) {
  return (
    <Action.Push
      icon={Icon.Stars}
      title={props.title || "Recent Updates"}
      target={<ReleaseLogDetail />}
      onPush={props.onPush}
    />
  );
}

function ActionCurrentVersion() {
  const easydict = new Easydict();
  return (
    <Action.OpenInBrowser
      icon={Icon.Eye}
      title={`Version: ${easydict.version}`}
      url={easydict.getCurrentReleaseTagUrl()}
    />
  );
}

function playSoundIcon(lightTintColor: string) {
  return {
    source: { light: "play.png", dark: "play.png" },
    tintColor: { light: lightTintColor, dark: "lightgray" },
  };
}

/**
 * Return the corresponding ImageLike based on the ListDisplayType
 */
export function getListItemIcon(listDisplayType: ListDisplayType | undefined): Image.ImageLike {
  // console.log(`---> list type: ${listDisplayType}, typeof: ${typeof listDisplayType}`);
  let dotColor: Color.ColorLike = Color.PrimaryText;
  switch (listDisplayType) {
    case SectionType.Translation: {
      dotColor = Color.Red;
      break;
    }
    case SectionType.Explanations: {
      dotColor = Color.Blue;
      break;
    }
    case SectionType.WebTranslation: {
      dotColor = Color.Yellow;
      break;
    }
    case SectionType.WebPhrase: {
      dotColor = "teal";
      break;
    }
  }

  let itemIcon: Image.ImageLike = {
    source: Icon.Dot,
    tintColor: dotColor,
  };

  if (listDisplayType === SectionType.Forms) {
    itemIcon = Icon.Receipt;
  }

  // if listDisplayType is undefined, use the default icon
  if (listDisplayType === undefined) {
    return itemIcon;
  }

  if (listDisplayType in TranslationType) {
    itemIcon = getQueryTypeIcon(listDisplayType as TranslationType);
  }

  // LingueeDisplayType is string enum, so we need to check if it is in the enum
  if (Object.values(LingueeDisplayType).includes(listDisplayType as LingueeDisplayType)) {
    itemIcon = getLingueeItemIcon(listDisplayType as LingueeDisplayType);
  }

  // console.log(`---> end list type: ${listDisplayType}`);

  return itemIcon;
}

/**
 * Return the corresponding ImageLike based on LingueeDisplayType
 */
export function getLingueeItemIcon(lingueeDisplayType: LingueeDisplayType): Image.ImageLike {
  // console.log(`---> linguee type: ${lingueeDisplayType}`);
  let dotColor: Color.ColorLike = Color.PrimaryText;
  switch (lingueeDisplayType) {
    case LingueeDisplayType.AlmostAlways:
    case LingueeDisplayType.OftenUsed: {
      dotColor = Color.Red;
      break;
    }
    case LingueeDisplayType.SpecialTag: {
      dotColor = Color.Purple;
      break;
    }
    case LingueeDisplayType.Common: {
      dotColor = Color.Blue;
      break;
    }
    case LingueeDisplayType.LessCommon: {
      dotColor = Color.Yellow;
      break;
    }
    case LingueeDisplayType.Unfeatured: {
      dotColor = "#CA8EC2"; // #A066D3, #B766AD
      break;
    }
    case LingueeDisplayType.Example: {
      dotColor = "teal";
      break;
    }
    case LingueeDisplayType.RelatedWord: {
      dotColor = "gray";
      break;
    }
    case LingueeDisplayType.Wikipedia: {
      dotColor = "#8080C0";
      break;
    }
  }
  // console.log(`---> dot color: ${dotColor}`);
  const itemIcon: Image.ImageLike = {
    source: Icon.Dot,
    tintColor: dotColor,
  };
  return itemIcon;
}

/**
 * Get query type icon based on the section type.
 */
function getQueryTypeIcon(queryType: QueryType): Image.ImageLike {
  return {
    source: `${queryType}.png`,
    mask: Image.Mask.RoundedRectangle,
  };
}

/**
  return List.Item.Accessory[] based on the SectionType type
*/
export function getWordAccessories(
  sectionType: ListDisplayType,
  item: YoudaoTranslateReformatResultItem
): List.Item.Accessory[] {
  let wordExamTypeAccessory = [];
  let pronunciationAccessory = [];
  let wordAccessories: List.Item.Accessory[] = [];
  if (sectionType === SectionType.Translation) {
    if (item.examTypes) {
      wordExamTypeAccessory = [
        {
          icon: { source: Icon.Star, tintColor: Color.SecondaryText },
          tooltip: "Word included in the types of exam",
        },
        { text: item.examTypes?.join("  ") },
      ];
      wordAccessories = [...wordExamTypeAccessory];
    }
    if (item.phonetic) {
      pronunciationAccessory = [
        {
          icon: playSoundIcon("gray"),
          tooltip: "Pronunciation",
        },
        { text: item.phonetic },
      ];
      wordAccessories = [...wordAccessories, { text: " " }, ...pronunciationAccessory];
    }
  }
  return wordAccessories;
}

/**
 * Return WebTranslationItem according to the query type and info
 */
function getWebTranslationItem(queryType: QueryType, queryTextInfo: QueryWordInfo): WebTranslationItem | undefined {
  // console.log(`---> getWebTranslationItem: ${queryType}, ${JSON.stringify(queryTextInfo, null, 2)}`);
  let webUrl;
  let title = `${queryType} Translate`;
  if (queryType in DicionaryType) {
    title = `${queryType} Dictionary`;
  }
  const icon = getQueryTypeIcon(queryType);
  switch (queryType.toString()) {
    case TranslationType.Google.toString(): {
      webUrl = getGoogleWebTranslateURL(queryTextInfo);
      break;
    }
    case TranslationType.DeepL.toString(): {
      webUrl = getDeepLWebTranslateURL(queryTextInfo);
      break;
    }
    case DicionaryType.Youdao.toString(): {
      webUrl = getYoudaoWebTranslateURL(queryTextInfo);
      break;
    }
    case DicionaryType.Eudic.toString(): {
      webUrl = getEudicWebTranslateURL(queryTextInfo);
      break;
    }
  }
  // console.log(`---> type: ${queryType}, webUrl: ${webUrl}`);
  return webUrl ? { type: queryType, webUrl, icon, title } : undefined;
}

function WebTranslationAction(props: { webTranslationItem?: WebTranslationItem }) {
  return props.webTranslationItem?.webUrl ? (
    <Action.OpenInBrowser
      icon={props.webTranslationItem.icon}
      title={props.webTranslationItem.title}
      url={props.webTranslationItem.webUrl}
    />
  ) : null;
}
