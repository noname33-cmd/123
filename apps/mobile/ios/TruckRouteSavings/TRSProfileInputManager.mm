#import <UIKit/UIKit.h>
#import <React/RCTViewManager.h>
#import <React/RCTComponent.h>

// UIKit owns the editing buffer. JS seeds it once per keyed editing session.
@interface TRSProfileInput : UIView
@property (nonatomic, copy) NSString *initialText;
@property (nonatomic, copy) NSString *inputKind;
@property (nonatomic, copy) NSString *inputLabel;
@property (nonatomic, assign) BOOL editingEnabled;
@property (nonatomic, copy) RCTBubblingEventBlock onTextChange;
@end

@implementation TRSProfileInput {
  BOOL _seeded;
  UITextField *_field;
}
- (instancetype)initWithFrame:(CGRect)frame {
  if ((self = [super initWithFrame:frame])) {
    self.isAccessibilityElement = NO;
    _field = [[UITextField alloc] initWithFrame:CGRectZero];
    _field.isAccessibilityElement = YES;
    _field.font = [UIFont systemFontOfSize:17];
    _field.textColor = [UIColor colorWithRed:16.0/255 green:37.0/255 blue:53.0/255 alpha:1];
    [_field addTarget:self action:@selector(textChanged) forControlEvents:UIControlEventEditingChanged];
    [self addSubview:_field];
  }
  return self;
}
- (void)setInitialText:(NSString *)text {
  _initialText = [text copy];
  if (!_seeded) {
    _field.text = text ?: @"";
    _seeded = YES;
  }
}
- (void)setInputKind:(NSString *)kind {
  _inputKind = [kind copy];
  _field.keyboardType = [kind isEqualToString:@"integer"] ? UIKeyboardTypeNumberPad :
    [kind isEqualToString:@"decimal"] ? UIKeyboardTypeDecimalPad : UIKeyboardTypeDefault;
  _field.autocorrectionType = [kind isEqualToString:@"text"] ? UITextAutocorrectionTypeDefault : UITextAutocorrectionTypeNo;
}
- (void)setInputLabel:(NSString *)label {
  _inputLabel = [label copy];
  _field.accessibilityLabel = label;
}
- (void)setEditingEnabled:(BOOL)enabled {
  _editingEnabled = enabled;
  _field.enabled = enabled;
}
- (void)textChanged {
  if (self.onTextChange) { self.onTextChange(@{@"text": _field.text ?: @""}); }
}
- (void)layoutSubviews {
  [super layoutSubviews];
  _field.frame = CGRectInset(self.bounds, 12, 0);
}
@end

@interface TRSProfileInputManager : RCTViewManager
@end
@implementation TRSProfileInputManager
RCT_EXPORT_MODULE(TRSProfileInput)
+ (BOOL)requiresMainQueueSetup { return YES; }
- (UIView *)view { return [TRSProfileInput new]; }
RCT_EXPORT_VIEW_PROPERTY(initialText, NSString)
RCT_EXPORT_VIEW_PROPERTY(inputKind, NSString)
RCT_EXPORT_VIEW_PROPERTY(inputLabel, NSString)
RCT_EXPORT_VIEW_PROPERTY(editingEnabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(onTextChange, RCTBubblingEventBlock)
@end
