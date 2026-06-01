package glance

import (
	"errors"
	"fmt"
	"html/template"
	"net/url"
	"slices"
	"strings"
)

var zedoWidgetTemplate = mustParseTemplate("zedo.html", "widget-base.html")

const (
	zedoDefaultBaseURL  = "https://zedo-supabase.lalaze.com/functions/v1/open-api/v1"
	zedoDefaultLimit    = 100
	zedoMaximumLimit    = 1000
	zedoDefaultLanguage = "zh"
)

var (
	zedoModuleTitles = map[string]string{
		"today":         "ZEDO Today",
		"tasks":         "ZEDO Tasks",
		"categories":    "ZEDO Categories",
		"memory":        "ZEDO Memory",
		"habits":        "ZEDO Habits",
		"focus":         "ZEDO Focus",
		"anniversaries": "ZEDO Anniversaries",
		"stats":         "ZEDO Stats",
		"review":        "ZEDO Review",
		"schedule":      "ZEDO Schedule",
	}
	zedoCollectionValues = []string{"tasks", "memory", "habits", "anniversaries"}
)

type zedoWidget struct {
	widgetBase  `yaml:",inline"`
	APIKey      string   `yaml:"api-key"`
	BaseURL     string   `yaml:"base-url"`
	Limit       int      `yaml:"limit"`
	Language    string   `yaml:"language"`
	Module      string   `yaml:"-"`
	Sections    []string `yaml:"sections"`
	Collections []string `yaml:"collections"`
	Mode        string   `yaml:"mode"`
	Date        string   `yaml:"date"`
}

func newZedoWidget(module string) *zedoWidget {
	return &zedoWidget{Module: module}
}

func (widget *zedoWidget) initialize() error {
	if widget.Module == "" {
		widget.Module = "tasks"
	}

	title, ok := zedoModuleTitles[widget.Module]
	if !ok {
		return fmt.Errorf("invalid zedo module: %s", widget.Module)
	}
	widget.withTitle(title).withError(nil)

	widget.APIKey = strings.TrimSpace(widget.APIKey)
	if widget.APIKey == "" {
		return errors.New("api-key is required")
	}

	widget.BaseURL = strings.TrimSpace(widget.BaseURL)
	if widget.BaseURL == "" {
		widget.BaseURL = zedoDefaultBaseURL
	}

	parsedURL, err := url.Parse(widget.BaseURL)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return fmt.Errorf("invalid base-url: %s", widget.BaseURL)
	}
	widget.BaseURL = strings.TrimRight(parsedURL.String(), "/")

	if widget.Limit <= 0 {
		widget.Limit = zedoDefaultLimit
	} else if widget.Limit > zedoMaximumLimit {
		widget.Limit = zedoMaximumLimit
	}

	widget.Language = strings.ToLower(strings.TrimSpace(widget.Language))
	if widget.Language == "" {
		widget.Language = zedoDefaultLanguage
	}
	switch widget.Language {
	case "zh", "en":
	default:
		return fmt.Errorf("invalid language: %s", widget.Language)
	}

	widget.Mode = strings.ToLower(strings.TrimSpace(widget.Mode))
	if widget.Mode == "" {
		widget.Mode = "daily"
	}
	switch widget.Mode {
	case "daily", "weekly":
	default:
		return fmt.Errorf("invalid mode: %s", widget.Mode)
	}

	widget.Date = strings.ToLower(strings.TrimSpace(widget.Date))
	if widget.Date == "" {
		widget.Date = "today"
	}

	widget.Sections = normalizeZedoList(widget.Sections, zedoCollectionValues)
	widget.Collections = normalizeZedoList(widget.Collections, defaultZedoCollections(widget.Module))

	return nil
}

func normalizeZedoList(values []string, defaults []string) []string {
	if len(values) == 0 {
		return slices.Clone(defaults)
	}

	normalized := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		item := strings.ToLower(strings.TrimSpace(value))
		if item == "" || !slices.Contains(zedoCollectionValues, item) {
			continue
		}
		if _, exists := seen[item]; exists {
			continue
		}
		seen[item] = struct{}{}
		normalized = append(normalized, item)
	}

	if len(normalized) == 0 {
		return slices.Clone(defaults)
	}
	return normalized
}

func defaultZedoCollections(module string) []string {
	switch module {
	case "schedule":
		return []string{"tasks", "memory", "habits"}
	case "stats":
		return nil
	default:
		return zedoCollectionValues
	}
}

func (widget *zedoWidget) SectionsCSV() string {
	return strings.Join(widget.Sections, ",")
}

func (widget *zedoWidget) CollectionsCSV() string {
	return strings.Join(widget.Collections, ",")
}

func (widget *zedoWidget) Render() template.HTML {
	return widget.renderTemplate(widget, zedoWidgetTemplate)
}
