@extends('voyager::master')
@section('page_title', 'My Market')
@section('content')
    <div class="page-content">
        @include('voyager::alerts')
       {{--@include('voyager::dimmers')--}} 
        <div class="col-md-12 pdr0 oneonofftab">
                <div class="panel_bx1">
                    <div class="panel_bx1_outer mymarketlist-page-outer">                       
                  
                        <div class="">                        
                            <div class="panel with-nav-tabs panel-default">
                                <div class="panel-heading"> 
                                    <ul class="nav nav-tabs mobile_responsive">
                                       <li class="active">
                                          <a href="javascript:void(0)"  onclick="getlivematches(0)" id="0" data-toggle="tab">
                                              <span class="category_icon"></span>                                              
                                            All
                                          </a>
                                        </li>
                                    <script type="text/javascript"> SPORTSID =0 </script>
                                       @forelse($Sports as $key=>$slist)                                      
                                         <li>

                                          <a href="javascript:void(0)" id="{{$slist->sport_id}}"  onclick="getlivematches({{$slist->sport_id}})" data-toggle="tab">
                                          @if($slist->image)
                                              <span class="category_icon"><img src="{{ URL::asset('storage/app/public/sports') }}/{{$slist->image}} " alt="icon" width="23px"/></span>
                                              @endif
                                            {{$slist->name}}
                                          </a>
                                          </li>
                                         @empty
                                        <li class="active"><a href="javascript:void(0)">No Sports Found!</a></li>                   
                                      @endforelse   
                                    <li class="pull-right"><button type="button" class="btn btn-sm btn-success refreshDataTable" onclick="window.location.reload()" style="margin: 4px;">Refresh</button>
                                      </li>
                                    </ul>
                                </div>
                                <div class="panel-body padding0" style="padding: 0px;">
                                    <div class="tab-content">
                                        <div class="tab-pane fade in active deshbord_tabing">                                        

                                            <!-- Tab panes -->
                                            <div class="tab-content">
                                              <div id="livematches" class="container-fluid tab-pane active" style="padding: 0px;">
                                                <div class="row">
                                                  <div class="col-md-12">
                                                   <div class="responsive_data">
                                                      <table id="livematches" class="table table-hover table-responsive ds_table_mct">
                                                          <thead>
                                                              <tr>                                                               
                                                                  <th>Series Name </th>                                                       
                                                                  <th class="mtch_name1_td">Match Name </th> 
                                                                  <th>Date</th>
                                                                  <th class="lst_td">Action</th>
                                                              </tr>
                                                          </thead>
                                                          <tbody>                                                             
                                                          </tbody>
                                                      </table>  
                                                    </div> 
                                                  </div>
                                                </div>
                                              </div>
                                         
                                            </div>                                            
                                        </div>                                       
                                    </div>
                                </div>
                            </div>                         
                        </div>                       
                    </div>
                </div>
            </div>
        </div>

        <div id="passwordmyModal" class="modal fade" role="dialog">
          <div class="modal-dialog">

            <!-- Modal content-->
            <div class="modal-content">
              <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal">&times;</button>
                <h4 class="modal-title">Password</h4>
              </div>
              <div class="modal-body">
                   <div class="form-group col-md-12">                  
                     <label>Password</label>
                     <input type="password" name="password" id="password" ng-model="password" class="form-control" placeholder="Please enter password">
                     <div id="errormsg"></div>
                   </div>
                   <input type="hidden" id="matchdeails" value="">
                   <input type="hidden" id="match_id" value="">
                   <input type="hidden" id="type" value="">
                   <input type="hidden" id="lockType" value="">
                   
              </div>
              <div class="clearfix"></div>
              <div class="modal-footer">
                <button type="button" class="btn btn-primary"  id="betfair_bet_allow">Submit</button>
              </div>
            </div>

          </div>
        </div>
        <div id="passwordmyModal2" class="modal fade" role="dialog">
          <div class="modal-dialog">

            <!-- Modal content-->
            <div class="modal-content">
              <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal">&times;</button>
                <h4 class="modal-title">Password</h4>
              </div>
              <div class="modal-body">
                   <div class="form-group col-md-12">                  
                     <label>Password</label>
                     <input type="password" name="password" id="password2" class="form-control" placeholder="Please enter password">
                     <div id="errormsg2"></div>
                   </div>
                   <input type="hidden" id="Fmatchdeails" value="">
                   <input type="hidden" id="Fmatch_id" value="">
                   <input type="hidden" id="Ftype" value="">
                   <input type="hidden" id="FlockType" value="">
                   
              </div>
              <div class="clearfix"></div>
              <div class="modal-footer">
                <button type="button" class="btn btn-primary"  id="session_bet_allow">Submit</button>
              </div>
            </div>

          </div>
        </div>
@stop


@section('javascript')
<script>
$(document).ready(function () {
  var sessionSportID = '{{ $sessionSportID }}';
/*
** Get Dashboard Match Selection & Fancy Markests
*/
  $(document).on('click',".get_match_selection",function(){ 
     var thisClick =$(this);  
      var link_name = $(this).attr('data-id');
      $("body").addClass("searchDisable"); 
      $("body").addClass("loaderONClick"); 
        $.ajax({
          headers: {'X-CSRF-TOKEN': "{{ csrf_token() }}"},
          type: "POST",
          url: '{{route("voyager.selections")}}',
          data: {data:link_name},
          dataType: "html",
          success: function(res) { 
          $("body").removeClass("loaderONClick");        
            $("body").addClass("openmodal");           
            $('#showresult').html(res);        
          },
          error: function (jqXHR, exception) {            
          }
      });
    }) 
  if(sessionSportID == ''){  
    getlivematches(SPORTSID);
    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        }
    });
  }else{
    //$('ul.nav-tabs li a#'+sessionSportID).tab('show');
    getlivematches(0);
    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        }
    });
  }

});
    function getlivematches(sportId){ 
//$("body").addClass("loaderONClick");
  $t = $('table#livematches').DataTable({
          "pageLength": 25,
          "dom": '<"top"flp<"clear">>rt<"bottom"ip<"clear">>',
          processing: true,         
          serverSide: true,
           "bDestroy": true,
            "ordering": false,
            "language": {
              paginate: {
                  first:    '',
                  previous: '<',
                  next:     '>',
                  last:     ''
              },
              aria: {
                  paginate: {
                      first:    '',
                      previous: '',
                      next:     '',
                      last:     ''
                  }
              },
              "sSearch": "_INPUT_",
               "sSearchPlaceholder": "Search",
               "sLengthMenu": "Rows _MENU_",
               "sProcessing" : "<div id='overlay'><h2>Loading .. Please wait</h2></div>",
          },
           //"bLengthChange": false,
          //"bFilter": false,
          //"bInfo": false,
          //"bAutoWidth": false,
          ajax: {
            headers: {'X-CSRF-TOKEN': "{{ csrf_token() }}"},
              url : "{{ route('voyager.users.mymarketlist') }}",
              type:'POST',
              data: function(data) {data.sportId =sportId ;}
          },
          columns: [ 
              {data: 'seriesName', name: 'seriesName', searchable: true, orderable: false, 
                  render: function ( data, type, full ) {
                    var data_arr = data.split('|');
                    //var rrr =  full.is_cup=='Y'?  data_arr[0] + '&nbsp;<i class="warning voyager-trophy"></i>':data_arr[0] ;     
                    return  '<span id="detailpage" style="cursor:pointer" data-type="betfair" data-ids="'+data_arr[1]+'">'+data_arr[0]+'</span>';              
                  }
              }, 
              {data: 'name', name: 'MatchName', searchable: true, orderable: false, 
                  render: function ( data, type, full ) {
                    var data_arr = data.split('|');
                    var winloss = "";
                    
                    if(full.winloss !=null)
                    {
                     
                    var winlossData =full.winloss.slice(0, -3);    
                    winlossData =winlossData.split('@@@');                      
                     
                     for(var i=0; i<winlossData.length; i++)
                     {
                        var getIndex =winlossData[i].split('==='); 
                        if(getIndex[1] > 0)
                          {
                           winloss +='<span style="display:block">'+getIndex[0]+' :- <span class="green">'+$.number(getIndex[1],2)+'</span></span>';
                        }else{
                           winloss +='<span style="display:block">'+getIndex[0]+' :- <span class="red">'+$.number(getIndex[1],2)+'</span></span>';
                          }                       
                      }
                     }
                    /*var minusValue = winlossData[1].split('-');
                    var minusValue2 = winlossData[3].split('-');
                     console.log('full.winloss---------- ',winlossData);
                      if(minusValue[0] == ' '){
                        var winloss ='<span style="display:block">'+winlossData[0]+' <span class="red">'+$.number(winlossData[1],2)+'</span></span><span>'+winlossData[2]+' <span class="green">'+$.number(winlossData[3],2)+'</span></span>';
                      }else if(minusValue2[0] == ' '){
                         winloss ='<span style="display:block">'+winlossData[0]+' <span class="green">'+$.number(winlossData[1],2)+'</span></span><span>'+winlossData[2]+' <span class="red">'+$.number(winlossData[3],2)+'</span></span>';
                      }else{
                        winloss = '<span style="display:block">'+winlossData[0]+' <span class="green">'+$.number(winlossData[1],2)+'</span></span><span>'+winlossData[2]+' <span class="red">'+$.number(winlossData[3],2)+'</span></span>';
                      }*/
                    return '<span id="detailpage" style="cursor:pointer" data-type="betfair" data-ids="'+data_arr[1]+'">'+data_arr[0]+'</span>'+winloss;   
                  }
              },
              {data: 'start_date', name: 'Date', searchable: false, orderable: false,
              render: function ( data, type, full ) { 
                     return data;
                  }
              },
              {data: 'action', name: 'action', searchable: false, orderable: false}, 
          ],  
                   
      });
}

$(document).on('click', '#detailpage',function(){  
  var thisClick = $(this); 
  ids = $(this).attr('data-ids');
  sporttype = $(this).attr('data-type');
  $("body").addClass("loaderONClick"); 
  $.ajax({
        headers: {'X-CSRF-TOKEN': "{{ csrf_token() }}"},
        type: "POST",
        url: '{{route("voyager.matches.matchdetail")}}',
        data: {ids:ids, sporttype: sporttype},
         success: function(res) {

             if(res.status == 'success'){
              window.location.href = res.url;
              }
         },
         error:function(data){
              console.log('ERROR');
         }
    });
});

$(document).on('click', '.betfair_bet_allow_password', function(){
      var matchdeails = $(this).attr('action-id'); 
      var match_id = $(this).attr('id').replace('betA_',''); 
      var type = $(this).attr('data-allowtype'); 

      $("#matchdeails").val(matchdeails);
      $("#match_id").val(match_id);
      $("#type").val(type);
      $("#lockType").val('betfair');

      $("#passwordmyModal").modal('show');
});

$(document).on('click', '.session_bet_allow_password', function(){
      var matchdeails = $(this).attr('action-id'); 
      var match_id = $(this).attr('id').replace('betS_',''); 
      var type = $(this).attr('data-allowtype'); 

      $("#Fmatchdeails").val(matchdeails);
      $("#Fmatch_id").val(match_id);
      $("#Ftype").val(type);
      $("#FlockType").val('fancy');

      $("#passwordmyModal2").modal('show');
});

$(document).on('click',"#betfair_bet_allow", function(){
      var password = $("#password").val();
      var matchdeails = $("#matchdeails").val();
      var match_id = $("#match_id").val();
      var type = $("#type").val();
      
      
      $("body").addClass("loaderONClick");
      $.ajax({
            headers: {'X-CSRF-TOKEN': "{{ csrf_token() }}"},
            type: "post",
            url: '{{route("voyager.matches.betfaireBetAllowSettings")}}',
            data:{'data': btoa('BETS-'+matchdeails+'-LOCK'), 'type': btoa('BETS-'+type+'-LOCK'),'password': btoa('BETS-'+password+'-LOCK'), 'sendtype' : ''},
            dataType: "json",
            success: function(res) { 
              if(res.status == 'success'){
                if(!$("#betA_"+match_id).hasClass('btn-success')){
                    $("#betA_"+match_id).removeClass('btn-danger');
                    $("#betA_"+match_id).addClass('btn-success');
                    $("#betA_"+match_id).attr('data-allowtype', 'N'); 
                    $("#betA_"+match_id).attr('title', 'Betfair Bet Allow On');
                }else{
                    $("#betA_"+match_id).addClass('btn-danger');
                    $("#betA_"+match_id).removeClass('btn-success');
                    $("#betA_"+match_id).attr('data-allowtype', 'Y');
                    $("#betA_"+match_id).attr('title', 'Betfair Bet Allow Off');
                }
                $("#passwordmyModal").modal('hide');
              }else{
                $("#errormsg").css('color', 'red');
                $("#errormsg").html(res.message);
              }
              $("body").removeClass("loaderONClick"); 
            },
            error: function (jqXHR, exception) {            
            }
        });
});

$(document).on('click',".betfair_bet_allow", function(){
      var matchdeails = $(this).attr('action-id'); 
      var match_id = $(this).attr('id').replace('betA_',''); 
      var type = $(this).attr('data-allowtype');
      var password = '';
      
      $("body").addClass("loaderONClick");
      $.ajax({
            headers: {'X-CSRF-TOKEN': "{{ csrf_token() }}"},
            type: "post",
            url: '{{route("voyager.matches.betfaireBetAllowSettings")}}',
            data:{'data': btoa('BETS-'+matchdeails+'-LOCK'), 'type': btoa('BETS-'+type+'-LOCK'),'password': btoa('BETS-'+password+'-LOCK'), 'sendtype' : ''},
            dataType: "json",
            success: function(res) { 
              
                if(!$("#betA_"+match_id).hasClass('btn-success')){
                    $("#betA_"+match_id).removeClass('btn-danger');
                    $("#betA_"+match_id).addClass('btn-success');
                    $("#betA_"+match_id).attr('data-allowtype', 'N'); 
                    $("#betA_"+match_id).attr('title', 'Betfair Bet Allow On');
                }else{
                    $("#betA_"+match_id).addClass('btn-danger');
                    $("#betA_"+match_id).removeClass('btn-success');
                    $("#betA_"+match_id).attr('data-allowtype', 'Y');
                    $("#betA_"+match_id).attr('title', 'Betfair Bet Allow Off');
                }
                
              
              $("body").removeClass("loaderONClick"); 
            },
            error: function (jqXHR, exception) {            
            }
        });
});

$(document).on('click',"#session_bet_allow", function(){
      var password = $("#password2").val();
      var matchdeails = $("#Fmatchdeails").val();
      var match_id = $("#Fmatch_id").val();
      var type = $("#Ftype").val();

      $("body").addClass("loaderONClick");
      $.ajax({
            headers: {'X-CSRF-TOKEN': "{{ csrf_token() }}"},
            type: "post",
            url: '{{route("voyager.matches.sessionBetAllowSettings")}}',
            data:{'data': btoa('FANCY-'+matchdeails+'-LOCK'), 'type': btoa('FANCY-'+type+'-LOCK'),'password': btoa('BETS-'+password+'-LOCK'), 'sendtype' : ''},
            dataType: "json",
            success: function(res) { 
              if(res.status == 'success'){
                if(!$("#betS_"+match_id).hasClass('btn-success')){
                    $("#betS_"+match_id).removeClass('btn-danger');
                    $("#betS_"+match_id).addClass('btn-success');
                    $("#betS_"+match_id).attr('data-allowtype', 'N'); 
                    $("#betS_"+match_id).attr('title', 'Session Bet Allow On');
                }else{
                    $("#betS_"+match_id).addClass('btn-danger');
                    $("#betS_"+match_id).removeClass('btn-success');
                    $("#betS_"+match_id).attr('data-allowtype', 'Y');
                    $("#betS_"+match_id).attr('title', 'Session Bet Allow Off');
                }
                $("#passwordmyModal2").modal('hide');
              }else{
                $("#errormsg2").css('color', 'red');
                $("#errormsg2").html(res.message);
              }
              
              $("body").removeClass("loaderONClick"); 
            },
            error: function (jqXHR, exception) {            
            }
        });
});

$(document).on('click',".session_bet_allow", function(){
      var matchdeails = $(this).attr('action-id'); 
      var match_id = $(this).attr('id').replace('betS_',''); 
      var type = $(this).attr('data-allowtype');
      var password = '';
    
      $("body").addClass("loaderONClick");
      $.ajax({
            headers: {'X-CSRF-TOKEN': "{{ csrf_token() }}"},
            type: "post",
            url: '{{route("voyager.matches.sessionBetAllowSettings")}}',
            data:{'data': btoa('FANCY-'+matchdeails+'-LOCK'), 'type': btoa('FANCY-'+type+'-LOCK'),'password': btoa('BETS-'+password+'-LOCK'), 'sendtype' : ''},
            dataType: "json",
            success: function(res) { 
              
                if(!$("#betS_"+match_id).hasClass('btn-success')){
                    $("#betS_"+match_id).removeClass('btn-danger');
                    $("#betS_"+match_id).addClass('btn-success');
                    $("#betS_"+match_id).attr('data-allowtype', 'N'); 
                    $("#betS_"+match_id).attr('title', 'Session Bet Allow On');
                }else{
                    $("#betS_"+match_id).addClass('btn-danger');
                    $("#betS_"+match_id).removeClass('btn-success');
                    $("#betS_"+match_id).attr('data-allowtype', 'Y');
                    $("#betS_"+match_id).attr('title', 'Session Bet Allow Off');
                }
               
              
              
              $("body").removeClass("loaderONClick"); 
            },
            error: function (jqXHR, exception) {            
            }
        });
});
$(document).on('click',".changeMatchSettings",function(){ 
      var thisClick = $(this); 
      var matchdeails = $(this).attr('action-id'); 
    
      $("body").addClass("loaderONClick");
        $.ajax({
            headers: {'X-CSRF-TOKEN': "{{ csrf_token() }}"},
            type: "post",
            url: '{{route("voyager.matches.settings")}}',
            data:{'data': matchdeails},
            dataType: "html",
            success: function(res) { 
               $("body").removeClass("loaderONClick"); 

              $("body").addClass("openmodal");
              $('#showresult').html(res);        
            },
            error: function (jqXHR, exception) {            
            }
        });                    
  }) 

  /*Match Settings*/
  $(document).on('click',".changeCasinoMatchSettings",function(){ 
      var thisClick = $(this); 
      var matchdeails = $(this).attr('action-id'); 
    
      $("body").addClass("loaderONClick");
        $.ajax({
            headers: {'X-CSRF-TOKEN': "{{ csrf_token() }}"},
            type: "post",
            url: '{{route("voyager.matches.casionosettings")}}',
            data:{'data': matchdeails},
            dataType: "html",
            success: function(res) { 
               $("body").removeClass("loaderONClick"); 

              $("body").addClass("openmodal");
              $('#showresult').html(res);        
            },
            error: function (jqXHR, exception) {            
            }
        });                    
  }) 

  /*Match Settings Update*/
  $(document).on('click',".savebetfair",function(){ 
      var thisClick = $(this); 
  //if($('#save_match_settings').validationEngine('validate')){
    var formData = new FormData($('#save_match_settings')[0]);
      $('#processing').append('<i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i>');
        $.ajax({
            headers: {'X-CSRF-TOKEN': "{{ csrf_token() }}"},
            type: "post",
            url: '{{route("voyager.matches.settingsupdate")}}',
            processData: false,
            contentType: false,
            data:formData,
            success: function(res) { 
             $('#processing').find('i.fa-spinner').remove();
              if(res.status=='success')
              {
                 toastr.success(res.message); 
              }else{
                toastr.error(res.message); 
              }
            },
            error: function (jqXHR, exception) {            
            }
        });  
     // }                  
  }) 
  /*Match Settings Update*/
  $(document).on('click',".savesessionSetting",function(){ 
      var thisClick = $(this); 
  //if($('#save_match_settings').validationEngine('validate')){
    var formData = new FormData($('#save_match_session_settings')[0]);
      $('#processingtwo').append('<i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i>');
        $.ajax({
            headers: {'X-CSRF-TOKEN': "{{ csrf_token() }}"},
            type: "post",
            url: '{{route("voyager.matches.sessionSetting")}}',
            processData: false,
            contentType: false,
            data:formData,
            success: function(res) { 
             $('#processingtwo').find('i.fa-spinner').remove();
              if(res.status=='success')
              {
                 toastr.success(res.message); 
              }else{
                toastr.error(res.message); 
              }
            },
            error: function (jqXHR, exception) {            
            }
        });  
     // }                  
  }) 
</script>

@stop
