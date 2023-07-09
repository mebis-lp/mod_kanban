<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->libdir . '/formslib.php');
require_once('HTML/QuickForm/input.php');

/**
 * Moodleform type for color input.
 *
 * @package    mod_kanban
 * @copyright  2023 ISB Bayern
 * @author     Stefan Hanauska
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class MoodleQuickForm_color extends HTML_QuickForm_input {
    /**
     * Constructor
     *
     * @param string $name (optional) name of the color input
     * @param string $label (optional) color label
     * @param array $attributes (optional) Either a typical HTML attribute string
     *              or an associative array
     */
    public function __construct($name = null, $label = null, $attributes = null) {
        parent::__construct($name, $label, $attributes);
        $this->setType('color');
    }
}
