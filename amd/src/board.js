import {DragDrop} from 'core/reactive';
import selectors from 'mod_kanban/selectors';
import capabilities from 'mod_kanban/capabilities';
import exporter from 'mod_kanban/exporter';
import KanbanComponent from 'mod_kanban/kanbancomponent';
import Log from 'core/log';
import {saveCancel} from 'core/notification';
import * as Str from 'core/str';

/**
 * Component representing a kanban board.
 */
export default class extends KanbanComponent {
    LOCKED_COLUMNS = 1;
    LOCKED_COMPLETE = 2;

    /**
     * Init component
     * @param {HTMLElement} target Element to attach the component to
     * @returns {KanbanComponent}
     */
    static init(target) {
        let element = document.getElementById(target);
        return new this({
            element: element,
        });
    }

    /**
     * Called before registering to reactive instance.
     */
    create() {
        this.cmid = this.element.dataset.cmid;
        this.id = this.element.dataset.id;
    }

    /**
     * Watchers defined by this component.
     * @returns {array}
     */
    getWatchers() {
        return [
            {watch: `board:updated`, handler: this._boardUpdated},
            {watch: `columns:created`, handler: this._columnCreated},
            {watch: `board:deleted`, handler: this._reload},
            {watch: `common:updated`, handler: this._commonUpdated},
        ];
    }

    /**
     * Called once when state is ready (also if component is registered after initial state was set), attaching event
     * isteners and initializing drag and drop.
     * @param {*} state The initial state
     */
    async stateReady(state) {
        this.addEventListener(
            this.getElement(selectors.ADDCOLUMNFIRST),
            'click',
            this._addColumn
        );
        if (state.capabilities.get(capabilities.MANAGEBOARD).value == true) {
            this.addEventListener(
                this.getElement(selectors.LOCKBOARDCOLUMNS),
                'click',
                this._lockColumns
            );
            this.addEventListener(
                this.getElement(selectors.UNLOCKBOARDCOLUMNS),
                'click',
                this._unlockColumns
            );
            this.addEventListener(
                this.getElement(selectors.SAVEASTEMPLATE),
                'click',
                this._templateConfirm
            );
            this.addEventListener(
                this.getElement(selectors.SHOWTEMPLATE),
                'click',
                this._showTemplate
            );
            this.addEventListener(
                this.getElement(selectors.DELETETEMPLATE),
                'click',
                this._deleteTemplateConfirm
            );
        }
        this.addEventListener(
            this.getElement(selectors.DELETEBOARD),
            'click',
            this._deleteConfirm
        );
        this.addEventListener(
            this.getElement(selectors.SCROLLLEFT),
            'click',
            this._scrollLeft
        );
        this.addEventListener(
            this.getElement(selectors.SCROLLRIGHT),
            'click',
            this._scrollRight
        );
        this.addEventListener(
            this.getElement(selectors.MAIN),
            'scroll',
            this._updateScrollButtons
        );
        this.dragdrop = new DragDrop(this);
        if (state.common.liveupdate > 0) {
            this._continuousUpdate(state.common.liveupdate);
        }
        this.toggleClass('ontouchstart' in document.documentElement, 'mod_kanban_touch');
        this._updateScrollButtons();
    }

    /**
     * Called to show template.
     */
    _showTemplate() {
        window.location.href =
            M.cfg.wwwroot +
            '/mod/kanban/view.php?id=' +
            this.reactive.state.common.id +
            '&boardid=' +
            this.reactive.state.common.template;
    }

    /**
     * Reload current page.
     */
    _reload() {
        window.location.replace(
            M.cfg.wwwroot + '/mod/kanban/view.php?id=' + this.reactive.state.common.id +
            '&userid=' + this.reactive.state.common.userid);
    }

    /**
     * Start continuous update.
     * @param {number} seconds Seconds between two refresh calls, defaults to 10
     */
    _continuousUpdate(seconds = 10) {
        setInterval(() => {
            this.reactive.dispatch('getUpdates');
        }, seconds * 1000);
    }

    /**
     * Called when common data was updated
     * @param {*} param0
     */
    _commonUpdated({element}) {
        this.toggleClass(element.template != 0, 'mod_kanban_hastemplate');
    }

    /**
     * Remove all subcomponents dependencies.
     */
    destroy() {
        if (this.dragdrop !== undefined) {
            this.dragdrop.unregister();
        }
        this._reload();
    }

    /**
     * Display confirmation modal for saving a board as template.
     */
    _templateConfirm() {
        Str.get_strings([
            {key: 'saveastemplate', component: 'mod_kanban'},
            {key: 'saveastemplateconfirm', component: 'mod_kanban'},
            {key: 'save', component: 'core'},
        ]).then((strings) => {
            return saveCancel(
                strings[0],
                strings[1],
                strings[2],
                () => {
                    this._saveAsTemplate();
                }
            );
        }).catch((error) => Log.debug(error));
    }

    /**
     * Called when current board should be saved as template.
     */
    _saveAsTemplate() {
        this.reactive.dispatch('saveAsTemplate');
    }

    /**
     * Display confirmation modal for deleting a board.
     */
    _deleteConfirm() {
        Str.get_strings([
            {key: 'deleteboard', component: 'mod_kanban'},
            {key: 'deleteboardconfirm', component: 'mod_kanban'},
            {key: 'delete', component: 'core'},
        ]).then((strings) => {
            return saveCancel(
                strings[0],
                strings[1],
                strings[2],
                () => {
                    this._deleteBoard();
                }
            );
        }).catch((error) => Log.debug(error));
    }

    /**
     * Display confirmation modal for deleting a template.
     */
    _deleteTemplateConfirm() {
        Str.get_strings([
            {key: 'deletetemplate', component: 'mod_kanban'},
            {key: 'deletetemplateconfirm', component: 'mod_kanban'},
            {key: 'delete', component: 'core'},
        ]).then((strings) => {
            return saveCancel(
                strings[0],
                strings[1],
                strings[2],
                () => {
                    this._deleteBoard();
                }
            );
        }).catch((error) => Log.debug(error));
    }

    /**
     * Called to delete current board.
     */
    _deleteBoard() {
        this.reactive.dispatch('deleteBoard');
    }

    /**
     * Called when board was updated.
     * @param {*} param0
     */
    _boardUpdated({element}) {
        const colcontainer = this.getElement(selectors.COLUMNCONTAINER);
        if (element.sequence !== undefined) {
            let sequence = element.sequence.split(',');
            // Remove all columns from frontend that are no longer present in the database.
            [...colcontainer.children]
                .forEach((node) => {
                    if (node.classList.contains('mod_kanban_column') && !sequence.includes(node.dataset.id)) {
                        colcontainer.removeChild(node);
                    }
                });
            // Reorder columns according to sequence from the database.
            [...colcontainer.children]
                .sort((a, b) => sequence.indexOf(a.dataset.id) > sequence.indexOf(b.dataset.id) ? 1 : -1)
                .forEach(node => colcontainer.appendChild(node));
        }
        // Set CSS classes to show/hide action menu items.
        this.toggleClass(element.locked, 'mod_kanban_board_locked_columns');
        this.toggleClass(element.hastemplate, 'mod_kanban_hastemplate');
    }

    /**
     * Called when a new column was added. Creates a new subcomponent.
     * @param {*} param0
     */
    async _columnCreated({element}) {
        let data = Object.assign({
            id: element.id,
            title: element.title,
            options: element.options,
            sequence: element.sequence,
        }, exporter.exportCapabilities(this.reactive.state));
        let placeholder = document.createElement('li');
        placeholder.setAttribute('data-id', data.id);
        this.getElement(selectors.COLUMNCONTAINER).appendChild(placeholder);
        const newcomponent = await this.renderComponent(placeholder, 'mod_kanban/column', data);
        const newelement = newcomponent.getElement();
        this.getElement(selectors.COLUMNCONTAINER).replaceChild(newelement, placeholder);
    }

    /**
     * Called to add a column.
     */
    _addColumn() {
        document.activeElement.blur();
        // Board component only handles adding a column at the leftmost position, hence second parameter is always 0.
        this.reactive.dispatch('addColumn', 0);
    }

    /**
     * Called to lock all columns.
     */
    _lockColumns() {
        this.reactive.dispatch('lockColumns');
    }

    /**
     * Called to unlock all columns.
     */
    _unlockColumns() {
        this.reactive.dispatch('unlockColumns');
    }

    /**
     * Validate draggable data. This component only accepts columns.
     * @param {object} dropdata
     * @returns {boolean} if the data is valid for this drop-zone.
     */
    validateDropData(dropdata) {
        let type = dropdata?.type;
        return type == 'column';
    }

    /**
     * Executed when a valid dropdata is dropped over the drop-zone.
     * Moves the dropped column to the leftmost position (other positions are handled by column component).
     * @param {object} dropdata
     */
    drop(dropdata) {
        this.reactive.dispatch('moveColumn', dropdata.id, 0);
    }

    /**
     * Show some visual hints to the user.
     */
    showDropZone() {
        this.getElement(selectors.ADDCOLUMNCONTAINER).classList.add('mod_kanban_insert');
    }

    /**
     * Remove visual hints to the user.
     */
    hideDropZone() {
        this.getElement(selectors.ADDCOLUMNCONTAINER).classList.remove('mod_kanban_insert');
    }

    /**
     * Scroll to the left.
     */
    _scrollLeft() {
        this.getElement(selectors.MAIN).scrollLeft -= 80;
    }

    /**
     * Scroll to the right.
     */
    _scrollRight() {
        this.getElement(selectors.MAIN).scrollLeft += 80;
    }

    /**
     * Only show scroll buttons if it's possible to scroll in this direction.
     */
    _updateScrollButtons() {
        let main = this.getElement(selectors.MAIN);
        if (main.scrollLeft <= 1) {
            this.getElement(selectors.SCROLLLEFT).style.setProperty('visibility', 'hidden');
        } else {
            this.getElement(selectors.SCROLLLEFT).style.setProperty('visibility', 'visible');
        }
        if (main.scrollLeft < main.scrollLeftMax) {
            this.getElement(selectors.SCROLLRIGHT).style.setProperty('visibility', 'visible');
        } else {
            this.getElement(selectors.SCROLLRIGHT).style.setProperty('visibility', 'hidden');
        }
    }
}
