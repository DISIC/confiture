export enum Platform {
  DESKTOP = "Ordinateur",
  MOBILE = "Mobile"
}

export enum OperatingSystem {
  MAC_OS = "MacOS",
  WINDOWS = "Windows",
  I_OS = "iOS",
  ANDROID = "Android"
}

export enum AssistiveTechnology {
  JAWS = "JAWS",
  NVDA = "NVDA",
  VOICE_OVER = "VoiceOver",
  TALKBACK = "Talkback"
}

export enum Browsers {
  FIREFOX = "Firefox",
  CHROME = "Google Chrome",
  SAFARI = "Safari",
  EDGE = "Microsoft Edge"
}

export enum Limitations {
  FILE_SIZE = 2000000
}

export enum FileErrorMessage {
  UPLOAD_SIZE = "Votre fichier dépasse la limite de 2 Mo. Veuillez choisir un fichier plus léger.",
  UPLOAD_FORMAT = "Format de fichier non supporté.",
  UPLOAD_FORMAT_EXAMPLE = "Format de fichier non supporté. Veuillez choisir un fichier jpg, jpeg ou png.",
  FETCH_ERROR = "Impossible de récupérer le fichier distant",
  UPLOAD_TIMEOUT = "Une erreur réseau empêche le téléchargement du fichier (expiration du délai d'attente). Veuillez réessayer.",
  UPLOAD_UNKNOWN = "Une erreur inconnue empêche le téléchargement du fichier. Veuillez réessayer.",
  DELETE_TIMEOUT = "Une erreur réseau empêche la suppression du fichier (expiration du délai d'attente). Veuillez réessayer.",
  DELETE_UNKNOWN = "Une erreur inconnue empêche la suppression du fichier. Veuillez réessayer."
}
