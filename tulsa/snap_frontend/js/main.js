(function(w, $){

    function View(){

    }

    var templates = {
        YesNo: _.template($('#yes_no_input').html()),
        input: _.template($('#default_input').html()),
    };

    function QuestionController(questions, options) {
        if (typeof options === null) {
            options = {};
        }
        this.options = _.defaults(options, {
            render_div: "#question_field",
            back_button: "#back_btn"
        });
        this.questions = questions;
        this.answers = {};
        this.index = 0;
        this.history = [];
    }

    QuestionController.prototype.get_question = function (name) {
        return _.findWhere(this.questions, {name: name});
    };

    QuestionController.prototype.next_question = function (current_question) {
        // get either the next question when succesfully validated
        // or the actual next step
        next_name = current_question.next || current_question.next_question_pass;
        this.index = _.indexOf(this.questions, this.get_question(next_name));
    };

    QuestionController.prototype.fail = function () {
        throw Error('wat');
    };

    QuestionController.prototype.get_current = function () {
        return this.questions[this.index];
    };

    QuestionController.prototype.store_value = function (name, value) {
        this.answers[name] = value;
        return this;
    };

    QuestionController.prototype.get_value = function (name) {
        try {
            return this.answers[name];
        } catch(e){
            return none;
        }
    };

    QuestionController.prototype.render_current = function () {
        var self, current, current_value;
        self = this;
        current = this.get_current();
        current_value = this.get_value(current.name);
        context = _.defaults({
            input_type: 'text',
            value: current_value
        }, current);

        template = templates[current.question_type];
        tmpl = $(template(context));
        // terrible but wat
        // handle yes/no actions
        if (current.question_type == 'YesNo') {
            tmpl.on('click', '.action', function(e){
                e.preventDefault();
                if ($(e.currentTarget).hasClass('yes-btn')) {
                    self.store_value(current.name, true);
                    self.next_question(current);
                    self.render();
                }else{
                    self.store_value(current.name, false);
                    self.fail();
                }
                return false;
            });
        }else if(current.question_type == 'input'){
            tmpl.on('click', '.btn-next', function(e){
                e.preventDefault();
                var val = tmpl.find('.input_value');
                val_el = val[0];
                if (val_el.checkValidity && !val_el.checkValidity()) {
                    // html5 validate, if a special type is specified
                    return false;
                }
                self.store_value(current.name, val.val());
                self.next_question(current);
                self.render();
                return false;
            });
        }
        return tmpl;
    };

    QuestionController.prototype.render = function () {
        $(this.options.render_div).html(this.render_current());
    };

    var region = null;

    $(function() {
        // Start this up
        $.getJSON('../Simple/questions.json').done(function(resp) {
            w.questions = new QuestionController(resp.questions, {});
            w.questions.render();
            region = resp.region;
        }).fail(function(resp, textStatus, error) {
            console.error("failed to get questions JSON" + error);
        });
    });

})(window, jQuery);
