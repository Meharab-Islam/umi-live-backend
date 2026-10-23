import os

# 1. Update chat_background_response_model.dart
bg_model_path = '/Users/kitkat/development/projects/umi_live/lib/features/chat/models/chat_background_response_model.dart'
with open(bg_model_path, 'r') as f:
    bg_model_content = f.read()

old_bg_from_json = """  factory ChatBackgroundModel.fromJson(Map<String, dynamic> json) {
    return ChatBackgroundModel(
      conversationId: int.tryParse(json['conversation_id']?.toString() ??
          json['conversationId']?.toString() ??
          ''),
      backgroundImage: json['background_image']?.toString() ??
          json['backgroundImage']?.toString(),
      backgroundColor: json['background_color']?.toString() ??
          json['backgroundColor']?.toString(),
      updatedBy: int.tryParse(json['updated_by']?.toString() ??
          json['updatedBy']?.toString() ??
          ''),
      updatedAt: json['updated_at']?.toString() ??
          json['updatedAt']?.toString(),
    );
  }"""

new_bg_from_json = """  factory ChatBackgroundModel.fromJson(Map<String, dynamic> json) {
    return ChatBackgroundModel(
      conversationId: int.tryParse(json['conversation_id']?.toString() ??
          json['conversationId']?.toString() ??
          ''),
      backgroundImage: json['background_image']?.toString() ??
          json['backgroundImage']?.toString() ??
          json['image_url']?.toString() ??
          json['imageUrl']?.toString(),
      backgroundColor: json['background_color']?.toString() ??
          json['backgroundColor']?.toString() ??
          json['color']?.toString(),
      updatedBy: int.tryParse(json['updated_by']?.toString() ??
          json['updatedBy']?.toString() ??
          ''),
      updatedAt: json['updated_at']?.toString() ??
          json['updatedAt']?.toString(),
    );
  }"""

if old_bg_from_json in bg_model_content:
    bg_model_content = bg_model_content.replace(old_bg_from_json, new_bg_from_json)
    with open(bg_model_path, 'w') as f:
        f.write(bg_model_content)
    print("Updated chat_background_response_model.dart")
else:
    print("chat_background_response_model.dart already updated or target not found")

# 2. Update conversation_messages_response_model.dart
conv_msg_path = '/Users/kitkat/development/projects/umi_live/lib/features/chat/models/conversation_messages_response_model.dart'
with open(conv_msg_path, 'r') as f:
    conv_msg_content = f.read()

if "import 'chat_background_response_model.dart';" not in conv_msg_content:
    conv_msg_content = "import 'chat_background_response_model.dart';\n" + conv_msg_content

# Add background field to ConversationMessagesResponseModel
old_fields = """  final List<ConversationMessageItemModel> messages;
  final String? message;"""

new_fields = """  final List<ConversationMessageItemModel> messages;
  final ChatBackgroundModel? background;
  final String? message;"""

if old_fields in conv_msg_content:
    conv_msg_content = conv_msg_content.replace(old_fields, new_fields)

# Add to constructor
old_ctor = """    this.messages = const [],
    this.message,"""

new_ctor = """    this.messages = const [],
    this.background,
    this.message,"""

if old_ctor in conv_msg_content:
    conv_msg_content = conv_msg_content.replace(old_ctor, new_ctor)

# Add to fromJson
old_from_json = """    final list = json['messages'];
    final parsedMessages = (list is List)
        ? list
            .whereType<Map<String, dynamic>>()
            .map(ConversationMessageItemModel.fromJson)
            .toList()
        : const <ConversationMessageItemModel>[];

    return ConversationMessagesResponseModel("""

new_from_json = """    final list = json['messages'];
    final parsedMessages = (list is List)
        ? list
            .whereType<Map<String, dynamic>>()
            .map(ConversationMessageItemModel.fromJson)
            .toList()
        : const <ConversationMessageItemModel>[];

    ChatBackgroundModel? bg;
    if (json['background'] is Map<String, dynamic>) {
      bg = ChatBackgroundModel.fromJson(json['background'] as Map<String, dynamic>);
    } else if (json['background'] is Map) {
      bg = ChatBackgroundModel.fromJson(Map<String, dynamic>.from(json['background'] as Map));
    } else if (json['background_image'] != null || json['background_color'] != null) {
      bg = ChatBackgroundModel.fromJson(json);
    }

    return ConversationMessagesResponseModel("""

if old_from_json in conv_msg_content:
    conv_msg_content = conv_msg_content.replace(old_from_json, new_from_json)

# Add background to return in fromJson
old_ret = """      totalPages: _parseInt(json['total_pages']),
      messages: parsedMessages,"""

new_ret = """      totalPages: _parseInt(json['total_pages']),
      messages: parsedMessages,
      background: bg,"""

if old_ret in conv_msg_content:
    conv_msg_content = conv_msg_content.replace(old_ret, new_ret)

# Add getters
old_getters = "  bool get isSuccess => success && statusCode >= 200 && statusCode < 300;"
new_getters = """  bool get isSuccess => success && statusCode >= 200 && statusCode < 300;

  String? get backgroundImage => background?.backgroundImage;
  String? get backgroundColor => background?.backgroundColor;"""

if old_getters in conv_msg_content:
    conv_msg_content = conv_msg_content.replace(old_getters, new_getters)

# Add to fromHttpResponse
old_from_http = """          messages: parsed.messages,
          message: (parsed.message != null && parsed.message!.isNotEmpty)"""

new_from_http = """          messages: parsed.messages,
          background: parsed.background,
          message: (parsed.message != null && parsed.message!.isNotEmpty)"""

if old_from_http in conv_msg_content:
    conv_msg_content = conv_msg_content.replace(old_from_http, new_from_http)

with open(conv_msg_path, 'w') as f:
    f.write(conv_msg_content)
print("Updated conversation_messages_response_model.dart")

# 3. Update chat_model.dart
chat_model_path = '/Users/kitkat/development/projects/umi_live/lib/features/chat/models/chat_model.dart'
with open(chat_model_path, 'r') as f:
    chat_model_content = f.read()

old_chat_fields = """  final String? role;
  final int? level;

  const ChatModel({"""

new_chat_fields = """  final String? role;
  final int? level;
  final String? backgroundImage;
  final String? backgroundColor;

  const ChatModel({"""

if old_chat_fields in chat_model_content:
    chat_model_content = chat_model_content.replace(old_chat_fields, new_chat_fields)

old_chat_ctor = """    this.role,
    this.level,
  });"""

new_chat_ctor = """    this.role,
    this.level,
    this.backgroundImage,
    this.backgroundColor,
  });"""

if old_chat_ctor in chat_model_content:
    chat_model_content = chat_model_content.replace(old_chat_ctor, new_chat_ctor)

with open(chat_model_path, 'w') as f:
    f.write(chat_model_content)
print("Updated chat_model.dart")

# 4. Update chat_conversation_item_model.dart
conv_item_path = '/Users/kitkat/development/projects/umi_live/lib/features/chat/models/chat_conversation_item_model.dart'
with open(conv_item_path, 'r') as f:
    conv_item_content = f.read()

if "import 'chat_background_response_model.dart';" not in conv_item_content:
    conv_item_content = "import 'chat_background_response_model.dart';\n" + conv_item_content

old_item_fields = """class ChatConversationItemModel {
  final int conversationId;
  final String lastMessage;
  final String lastMessageAt;
  final int unreadCount;
  final ChatPartnerUserModel? otherUser;"""

new_item_fields = """class ChatConversationItemModel {
  final int conversationId;
  final String lastMessage;
  final String lastMessageAt;
  final int unreadCount;
  final ChatPartnerUserModel? otherUser;
  final ChatBackgroundModel? background;"""

if old_item_fields in conv_item_content:
    conv_item_content = conv_item_content.replace(old_item_fields, new_item_fields)

old_item_ctor = """  const ChatConversationItemModel({
    required this.conversationId,
    required this.lastMessage,
    required this.lastMessageAt,
    this.unreadCount = 0,
    this.otherUser,
  });"""

new_item_ctor = """  const ChatConversationItemModel({
    required this.conversationId,
    required this.lastMessage,
    required this.lastMessageAt,
    this.unreadCount = 0,
    this.otherUser,
    this.background,
  });"""

if old_item_ctor in conv_item_content:
    conv_item_content = conv_item_content.replace(old_item_ctor, new_item_ctor)

old_item_from_json = """  factory ChatConversationItemModel.fromJson(Map<String, dynamic> json) {
    final other = json['other_user'];
    return ChatConversationItemModel(
      conversationId: _parseInt(json['conversation_id']),
      lastMessage: json['last_message']?.toString() ?? '',
      lastMessageAt: json['last_message_at']?.toString() ?? '',
      unreadCount: _parseInt(json['unread_count']),
      otherUser: other is Map<String, dynamic>
          ? ChatPartnerUserModel.fromJson(other)
          : null,
    );
  }"""

new_item_from_json = """  factory ChatConversationItemModel.fromJson(Map<String, dynamic> json) {
    final other = json['other_user'];
    ChatBackgroundModel? bg;
    if (json['background'] is Map<String, dynamic>) {
      bg = ChatBackgroundModel.fromJson(json['background'] as Map<String, dynamic>);
    } else if (json['background'] is Map) {
      bg = ChatBackgroundModel.fromJson(Map<String, dynamic>.from(json['background'] as Map));
    } else if (json['background_image'] != null || json['background_color'] != null) {
      bg = ChatBackgroundModel.fromJson(json);
    }
    return ChatConversationItemModel(
      conversationId: _parseInt(json['conversation_id']),
      lastMessage: json['last_message']?.toString() ?? '',
      lastMessageAt: json['last_message_at']?.toString() ?? '',
      unreadCount: _parseInt(json['unread_count']),
      otherUser: other is Map<String, dynamic>
          ? ChatPartnerUserModel.fromJson(other)
          : null,
      background: bg,
    );
  }"""

if old_item_from_json in conv_item_content:
    conv_item_content = conv_item_content.replace(old_item_from_json, new_item_from_json)

old_to_chat_model = """      role: user?.role,
      level: user?.level,
    );"""

new_to_chat_model = """      role: user?.role,
      level: user?.level,
      backgroundImage: background?.backgroundImage,
      backgroundColor: background?.backgroundColor,
    );"""

if old_to_chat_model in conv_item_content:
    conv_item_content = conv_item_content.replace(old_to_chat_model, new_to_chat_model)

with open(conv_item_path, 'w') as f:
    f.write(conv_item_content)
print("Updated chat_conversation_item_model.dart")

# 5. Update chat_details_controller.dart
chat_ctrl_path = '/Users/kitkat/development/projects/umi_live/lib/features/chat/controllers/chat_details_controller.dart'
with open(chat_ctrl_path, 'r') as f:
    chat_ctrl_content = f.read()

old_on_init = """    messageController.addListener(
      () => onMessageTextChanged(messageController.text),
    );
    fetchMessages();"""

new_on_init = """    if (chatPartner.backgroundImage != null && chatPartner.backgroundImage!.isNotEmpty) {
      customWallpaperPath.value = chatPartner.backgroundImage!;
    }
    if (chatPartner.backgroundColor != null && chatPartner.backgroundColor!.isNotEmpty) {
      customBackgroundColor.value = chatPartner.backgroundColor!;
    }
    messageController.addListener(
      () => onMessageTextChanged(messageController.text),
    );
    fetchMessages();"""

if old_on_init in chat_ctrl_content:
    chat_ctrl_content = chat_ctrl_content.replace(old_on_init, new_on_init)

old_fetch = """  Future<void> fetchMessages({int? page, int? limit}) async {
    final convId = int.tryParse(chatPartner.id);
    if (convId == null || convId <= 0) return;
    isLoadingMessages.value = true;
    messagesError.value = '';
    try {
      final response = await _apiService.getConversationMessages(
        convId,
        page: page,
        limit: limit,
      );
      if (response.success) {
        rawMessages.assignAll(response.messages);
        final mapped = response.messages
            .map((item) => item.toChatMessageModel())
            .toList();
        messageList.assignAll(mapped);
        scrollToBottom();
        if (chatPartner.unreadCount > 0) {
          _apiService.markConversationAsRead(convId);
        }
      }"""

new_fetch = """  Future<void> fetchMessages({int? page, int? limit}) async {
    final convId = resolvedConversationId ?? int.tryParse(chatPartner.id);
    if (convId == null || convId <= 0) return;
    isLoadingMessages.value = true;
    messagesError.value = '';
    try {
      final response = await _apiService.getConversationMessages(
        convId,
        page: page,
        limit: limit,
      );
      if (response.success) {
        rawMessages.assignAll(response.messages);
        final mapped = response.messages
            .map((item) => item.toChatMessageModel())
            .toList();
        messageList.assignAll(mapped);
        scrollToBottom();

        // Restore custom chat wallpaper and background color from API response
        final bgImg = response.backgroundImage;
        if (bgImg != null && bgImg.isNotEmpty) {
          customWallpaperPath.value = bgImg;
        }
        final bgColor = response.backgroundColor;
        if (bgColor != null && bgColor.isNotEmpty) {
          customBackgroundColor.value = bgColor;
        }

        if (chatPartner.unreadCount > 0) {
          _apiService.markConversationAsRead(convId);
        }
      }"""

if old_fetch in chat_ctrl_content:
    chat_ctrl_content = chat_ctrl_content.replace(old_fetch, new_fetch)

with open(chat_ctrl_path, 'w') as f:
    f.write(chat_ctrl_content)
print("Updated chat_details_controller.dart")
